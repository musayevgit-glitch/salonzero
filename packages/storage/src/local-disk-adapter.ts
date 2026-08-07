import { createReadStream, createWriteStream, type ReadStream } from 'node:fs';
import { mkdir, open, rm, stat } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import type { ObjectStat, StorageAdapter, UploadTarget } from './adapter';
import { signLocalToken, verifyLocalToken, type LocalTokenPayload } from './local-token';

const OBJECT_KEY_PATTERN =
  /^(employees|salons)\/[0-9a-f-]{36}\/(profile|portfolio|cover|logo)\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

export interface LocalDiskStorageAdapterOptions {
  baseDir: string;
  signingSecret: string;
  publicBaseUrl: string;
  uploadTtlMs?: number;
  downloadTtlMs?: number;
}

/** Local-disk stand-in for S3 (no Docker/S3 credentials in this environment — see ADR-0008). */
export class LocalDiskStorageAdapter implements StorageAdapter {
  private readonly baseDir: string;
  private readonly signingSecret: string;
  private readonly publicBaseUrl: string;
  private readonly uploadTtlMs: number;
  private readonly downloadTtlMs: number;

  constructor(options: LocalDiskStorageAdapterOptions) {
    this.baseDir = resolve(options.baseDir);
    this.signingSecret = options.signingSecret;
    this.publicBaseUrl = options.publicBaseUrl.replace(/\/$/, '');
    this.uploadTtlMs = options.uploadTtlMs ?? 10 * 60 * 1000;
    this.downloadTtlMs = options.downloadTtlMs ?? 5 * 60 * 1000;
  }

  /** Resolves an objectKey to an absolute path, refusing anything that could escape baseDir. */
  resolvePath(objectKey: string): string {
    if (!OBJECT_KEY_PATTERN.test(objectKey)) {
      throw new Error('Invalid object key.');
    }
    const full = resolve(join(this.baseDir, objectKey));
    if (!full.startsWith(this.baseDir + sep)) {
      throw new Error('Invalid object key.');
    }
    return full;
  }

  async createUploadTarget(
    objectKey: string,
    contentType: string,
    maxSizeBytes: number,
  ): Promise<UploadTarget> {
    this.resolvePath(objectKey); // validates shape before ever signing a token for it
    const exp = Date.now() + this.uploadTtlMs;
    const token = signLocalToken(
      { objectKey, purpose: 'upload', contentType, maxSizeBytes, exp },
      this.signingSecret,
    );
    return { method: 'PUT', url: `${this.publicBaseUrl}/${token}`, expiresAt: new Date(exp) };
  }

  async getObjectUrl(objectKey: string): Promise<string> {
    this.resolvePath(objectKey);
    const exp = Date.now() + this.downloadTtlMs;
    const token = signLocalToken({ objectKey, purpose: 'download', exp }, this.signingSecret);
    return `${this.publicBaseUrl}/${token}`;
  }

  async statObject(objectKey: string): Promise<ObjectStat | null> {
    try {
      const info = await stat(this.resolvePath(objectKey));
      return { sizeBytes: info.size };
    } catch {
      return null;
    }
  }

  async readObjectHead(objectKey: string, bytes: number): Promise<Buffer | null> {
    let handle;
    try {
      handle = await open(this.resolvePath(objectKey), 'r');
      const buffer = Buffer.alloc(bytes);
      const { bytesRead } = await handle.read(buffer, 0, bytes, 0);
      return buffer.subarray(0, bytesRead);
    } catch {
      return null;
    } finally {
      await handle?.close();
    }
  }

  async deleteObject(objectKey: string): Promise<void> {
    try {
      await rm(this.resolvePath(objectKey));
    } catch {
      // already gone — deletion is idempotent
    }
  }

  /** Used only by the local upload-serving route (apps/api), not part of the StorageAdapter interface. */
  async writeObject(objectKey: string, data: NodeJS.ReadableStream): Promise<void> {
    const path = this.resolvePath(objectKey);
    await mkdir(dirname(path), { recursive: true });
    await new Promise<void>((resolvePromise, reject) => {
      const out = createWriteStream(path);
      data.pipe(out);
      out.on('finish', () => resolvePromise());
      out.on('error', reject);
      data.on('error', reject);
    });
  }

  /**
   * Streams `data` to disk, aborting and deleting the partial file if more than `maxSizeBytes`
   * arrive — defense in depth against a forged/absent Content-Length header, since the caller's
   * own pre-check on that header is not itself trustworthy.
   */
  async writeObjectWithLimit(
    objectKey: string,
    data: NodeJS.ReadableStream,
    maxSizeBytes: number,
  ): Promise<void> {
    const path = this.resolvePath(objectKey);
    await mkdir(dirname(path), { recursive: true });
    let received = 0;

    await new Promise<void>((resolvePromise, reject) => {
      const out = createWriteStream(path);
      const fail = (err: Error) => {
        data.removeAllListeners();
        out.destroy();
        rm(path, { force: true }).finally(() => reject(err));
      };

      data.on('data', (chunk: Buffer) => {
        received += chunk.length;
        if (received > maxSizeBytes) {
          fail(new Error('Upload exceeds the allowed size limit.'));
        }
      });
      data.on('error', fail);
      out.on('error', fail);
      out.on('finish', () => resolvePromise());
      data.pipe(out);
    });
  }

  /** Full-object read stream for the local upload-serving route; not part of StorageAdapter. */
  createReadStream(objectKey: string): ReadStream {
    return createReadStream(this.resolvePath(objectKey));
  }

  /** Verifies a token this adapter signed, without exposing the signing secret to callers. */
  verifyToken(token: string): LocalTokenPayload | null {
    return verifyLocalToken(token, this.signingSecret);
  }
}
