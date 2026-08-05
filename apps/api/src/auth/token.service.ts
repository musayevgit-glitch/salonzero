import { randomBytes, createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';

// Single-use tokens for password reset / invitation acceptance (docs/security/authentication.md).
// Only the SHA-256 hash is ever persisted; the plaintext token exists only in the one response/email
// it is issued in. This is a standard use of Node's crypto primitives, not custom cryptography.
@Injectable()
export class TokenService {
  generate(): { token: string; tokenHash: string } {
    const token = randomBytes(32).toString('base64url');
    return { token, tokenHash: this.hash(token) };
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
