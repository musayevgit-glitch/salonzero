import {
  ConflictException,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Put,
  Req,
  Res,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { Readable } from 'node:stream';
import { detectImageMime, type LocalDiskStorageAdapter } from '@salonomia/storage';
import type { Request, Response } from 'express';
import { LOCAL_DISK_ADAPTER } from '../storage/storage.tokens';

async function readRequestBodyWithLimit(
  req: Request,
  maxSizeBytes: number,
): Promise<Buffer | null> {
  const chunks: Buffer[] = [];
  let received = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    received += buffer.length;
    if (received > maxSizeBytes) {
      return null;
    }
    chunks.push(buffer);
  }

  return Buffer.concat(chunks);
}

function safeInlineFilename(objectKey: string): string {
  return objectKey.split('/').pop()?.replace(/[^a-zA-Z0-9._-]/g, '_') ?? 'image';
}

// Serves as the "S3" endpoint for the local storage driver only (see ADR-0008) — real S3 uploads/
// downloads go straight to the bucket and never touch this controller. Every response is 404 on
// any failure (bad token, wrong purpose, expired, missing object) so this route never becomes an
// oracle for which tokens or object keys are valid.
@Controller('uploads')
export class UploadsController {
  constructor(
    @Inject(LOCAL_DISK_ADAPTER) private readonly localDisk: LocalDiskStorageAdapter | null,
  ) {}

  @Put(':token')
  async put(
    @Param('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const adapter = this.localDisk;
    if (!adapter) throw new NotFoundException();

    const payload = adapter.verifyToken(token);
    if (!payload || payload.purpose !== 'upload' || !payload.maxSizeBytes) {
      throw new NotFoundException();
    }

    const contentLength = Number(req.headers['content-length']);
    if (
      !Number.isFinite(contentLength) ||
      contentLength <= 0 ||
      contentLength > payload.maxSizeBytes
    ) {
      res.status(413).json({ message: 'Upload exceeds the allowed size limit.' });
      return;
    }

    const body = await readRequestBodyWithLimit(req, payload.maxSizeBytes);
    if (!body) {
      res.status(413).json({ message: 'Upload exceeds the allowed size limit.' });
      return;
    }

    const detectedMime = detectImageMime(body.subarray(0, 12));
    if (!detectedMime || detectedMime !== payload.contentType) {
      throw new UnsupportedMediaTypeException('Upload must be a recognized image.');
    }

    const existing = await adapter.statObject(payload.objectKey);
    if (existing) {
      throw new ConflictException('This upload target has already been used.');
    }

    await adapter.writeObject(payload.objectKey, Readable.from(body));

    res.status(204).send();
  }

  @Get(':token')
  async get(@Param('token') token: string, @Res() res: Response): Promise<void> {
    const adapter = this.localDisk;
    if (!adapter) throw new NotFoundException();

    const payload = adapter.verifyToken(token);
    if (!payload || payload.purpose !== 'download') {
      throw new NotFoundException();
    }

    const stat = await adapter.statObject(payload.objectKey);
    if (!stat) {
      throw new NotFoundException();
    }

    const head = await adapter.readObjectHead(payload.objectKey, 12);
    const contentType = head && detectImageMime(head);
    if (!contentType) {
      throw new NotFoundException();
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${safeInlineFilename(payload.objectKey)}"`,
    );
    res.setHeader('Cache-Control', 'private, max-age=60');
    const stream = adapter.createReadStream(payload.objectKey);
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  }
}
