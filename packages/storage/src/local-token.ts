import { createHmac, timingSafeEqual } from 'node:crypto';

export interface LocalTokenPayload {
  objectKey: string;
  purpose: 'upload' | 'download';
  contentType?: string;
  maxSizeBytes?: number;
  exp: number; // epoch ms
}

function base64url(input: Buffer): string {
  return input.toString('base64url');
}

export function signLocalToken(payload: LocalTokenPayload, secret: string): string {
  const body = base64url(Buffer.from(JSON.stringify(payload), 'utf8'));
  const signature = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

/** Returns null for any malformed, unsigned, mismatched-secret, or expired token — never throws. */
export function verifyLocalToken(token: string, secret: string): LocalTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, signature] = parts as [string, string];

  const expectedSignature = createHmac('sha256', secret).update(body).digest('base64url');
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8'),
    ) as LocalTokenPayload;
    if (typeof payload.objectKey !== 'string' || typeof payload.exp !== 'number') return null;
    if (payload.purpose !== 'upload' && payload.purpose !== 'download') return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
