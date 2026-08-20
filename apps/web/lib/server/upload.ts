import { randomUUID } from 'node:crypto';
import { detectImageMime } from '@salonomia/storage';
import { NextResponse } from 'next/server';
import { getStorageAdapter } from './storage';

const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function handleImageUpload(
  req: Request,
  keyPrefix: string, // e.g. 'salons/uuid/cover' or 'employees/uuid/profile'
  maxBytes: number,
): Promise<{ objectKey: string; url: string } | NextResponse> {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ message: 'Expected multipart/form-data.' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ message: 'Missing file field.' }, { status: 400 });
  }

  if (file.size > maxBytes) {
    return NextResponse.json(
      { message: `File exceeds ${Math.round(maxBytes / 1024 / 1024)} MB limit.` },
      { status: 413 },
    );
  }

  const mimeType = file.type;
  const ext = ALLOWED_MIME[mimeType];
  if (!ext) {
    return NextResponse.json(
      { message: 'Only JPEG, PNG, and WEBP images are accepted.' },
      { status: 415 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const detectedMime = detectImageMime(buffer.subarray(0, 12));
  if (!detectedMime || detectedMime !== mimeType) {
    return NextResponse.json(
      { message: 'File content does not match its declared type.' },
      { status: 415 },
    );
  }

  const objectKey = `${keyPrefix}/${randomUUID()}.${ext}`;

  try {
    const storage = getStorageAdapter();
    await storage.putObject(objectKey, buffer, mimeType);
  } catch (err) {
    console.error('[upload] putObject failed:', err);
    return NextResponse.json(
      { message: `Storage error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }

  const url = `/api/images/${objectKey}`;
  return { objectKey, url };
}
