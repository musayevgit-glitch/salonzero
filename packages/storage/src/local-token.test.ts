import { describe, expect, it } from 'vitest';
import { signLocalToken, verifyLocalToken } from './local-token';

const SECRET = 'test-signing-secret';

describe('local upload/download token signing', () => {
  it('round-trips a valid token', () => {
    const token = signLocalToken(
      { objectKey: 'employees/a/b.jpg', purpose: 'download', exp: Date.now() + 60_000 },
      SECRET,
    );
    const payload = verifyLocalToken(token, SECRET);
    expect(payload?.objectKey).toBe('employees/a/b.jpg');
    expect(payload?.purpose).toBe('download');
  });

  it('rejects a token signed with a different secret', () => {
    const token = signLocalToken(
      { objectKey: 'employees/a/b.jpg', purpose: 'download', exp: Date.now() + 60_000 },
      SECRET,
    );
    expect(verifyLocalToken(token, 'wrong-secret')).toBeNull();
  });

  it('rejects an expired token', () => {
    const token = signLocalToken(
      { objectKey: 'employees/a/b.jpg', purpose: 'download', exp: Date.now() - 1 },
      SECRET,
    );
    expect(verifyLocalToken(token, SECRET)).toBeNull();
  });

  it('rejects a tampered payload (objectKey swapped post-signing)', () => {
    const token = signLocalToken(
      { objectKey: 'employees/a/b.jpg', purpose: 'download', exp: Date.now() + 60_000 },
      SECRET,
    );
    const [body, signature] = token.split('.');
    const tamperedBody = Buffer.from(
      JSON.stringify({
        objectKey: 'employees/other/secret.jpg',
        purpose: 'download',
        exp: Date.now() + 60_000,
      }),
    ).toString('base64url');
    expect(verifyLocalToken(`${tamperedBody}.${signature}`, SECRET)).toBeNull();
    void body;
  });

  it('rejects a malformed token', () => {
    expect(verifyLocalToken('not-a-real-token', SECRET)).toBeNull();
    expect(verifyLocalToken('', SECRET)).toBeNull();
  });

  it('does not let an upload-purpose token pass as a download token check', () => {
    const token = signLocalToken(
      {
        objectKey: 'employees/a/b.jpg',
        purpose: 'upload',
        contentType: 'image/jpeg',
        maxSizeBytes: 100,
        exp: Date.now() + 60_000,
      },
      SECRET,
    );
    const payload = verifyLocalToken(token, SECRET);
    expect(payload?.purpose).toBe('upload');
  });
});
