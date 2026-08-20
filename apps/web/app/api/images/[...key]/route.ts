import { NextRequest, NextResponse } from 'next/server';
import { getStorageAdapter } from '../../../../lib/server/storage';

// Proxy image serving: generates a fresh signed URL and redirects.
// Stored URLs never expire — the signing happens on every request.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const objectKey = key.join('/');

  // Basic sanity check — must look like a valid object key
  if (!/^(employees|salons)\/[0-9a-f-]{36}\/.+\.(jpg|png|webp)$/.test(objectKey)) {
    return NextResponse.json({ message: 'Not found.' }, { status: 404 });
  }

  try {
    const storage = getStorageAdapter();
    const url = await storage.getObjectUrl(objectKey);
    return NextResponse.redirect(url, { status: 302 });
  } catch {
    return NextResponse.json({ message: 'Not found.' }, { status: 404 });
  }
}
