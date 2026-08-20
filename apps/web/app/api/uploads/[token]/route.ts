import { NextRequest, NextResponse } from 'next/server';
import { detectImageMime } from '@salonomia/storage';
import { getStorageAdapter } from '../../../../lib/server/storage';
import { Readable } from 'node:stream';

function getLocalAdapter() {
  const adapter = getStorageAdapter() as {
    verifyToken?: (token: string) => unknown;
    writeObjectWithLimit?: (
      key: string,
      stream: NodeJS.ReadableStream,
      max: number,
    ) => Promise<void>;
    statObject?: (key: string) => Promise<{ sizeBytes: number } | null>;
    readObjectHead?: (key: string, bytes: number) => Promise<Buffer | null>;
    createReadStream?: (key: string) => NodeJS.ReadableStream;
  };
  if (!adapter.verifyToken) return null;
  return adapter;
}

type UploadPayload = {
  objectKey: string;
  purpose: string;
  contentType?: string;
  maxSizeBytes?: number;
  exp?: number;
};

export async function PUT(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const adapter = getLocalAdapter();
  if (!adapter) return NextResponse.json({ message: 'Not found.' }, { status: 404 });

  const payload = adapter.verifyToken!(token) as UploadPayload | null;
  if (!payload || payload.purpose !== 'upload' || !payload.maxSizeBytes || !payload.contentType) {
    return NextResponse.json({ message: 'Not found.' }, { status: 404 });
  }

  if (payload.exp && Date.now() > payload.exp) {
    return NextResponse.json({ message: 'Upload URL has expired.' }, { status: 410 });
  }

  const contentLength = Number(req.headers.get('content-length'));
  if (
    !Number.isFinite(contentLength) ||
    contentLength <= 0 ||
    contentLength > payload.maxSizeBytes
  ) {
    return NextResponse.json(
      { message: 'Upload exceeds the allowed size limit.' },
      { status: 413 },
    );
  }

  const arrayBuffer = await req.arrayBuffer();
  const body = Buffer.from(arrayBuffer);
  if (body.length > payload.maxSizeBytes) {
    return NextResponse.json(
      { message: 'Upload exceeds the allowed size limit.' },
      { status: 413 },
    );
  }

  const detectedMime = detectImageMime(body.subarray(0, 12));
  if (!detectedMime || detectedMime !== payload.contentType) {
    return NextResponse.json({ message: 'Upload must be a recognized image.' }, { status: 415 });
  }

  const existing = await adapter.statObject!(payload.objectKey);
  if (existing) {
    return NextResponse.json(
      { message: 'This upload target has already been used.' },
      { status: 409 },
    );
  }

  await adapter.writeObjectWithLimit!(payload.objectKey, Readable.from(body), payload.maxSizeBytes);
  return new NextResponse(null, { status: 204 });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const adapter = getLocalAdapter();
  if (!adapter) return NextResponse.json({ message: 'Not found.' }, { status: 404 });

  const payload = adapter.verifyToken!(token) as UploadPayload | null;
  if (!payload || payload.purpose !== 'download') {
    return NextResponse.json({ message: 'Not found.' }, { status: 404 });
  }

  const stat = await adapter.statObject!(payload.objectKey);
  if (!stat) return NextResponse.json({ message: 'Not found.' }, { status: 404 });

  const head = await adapter.readObjectHead!(payload.objectKey, 12);
  const contentType = head && detectImageMime(head);
  if (!contentType) return NextResponse.json({ message: 'Not found.' }, { status: 404 });

  const stream = adapter.createReadStream!(payload.objectKey);
  const webStream = Readable.toWeb(stream as import('node:stream').Readable) as ReadableStream;

  return new NextResponse(webStream, {
    headers: {
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=60',
    },
  });
}
