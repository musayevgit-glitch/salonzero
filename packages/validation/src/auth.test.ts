import { describe, expect, it } from 'vitest';
import { isSafeRedirectPath, loginSchema, registerSchema } from './auth';

describe('registerSchema', () => {
  it('normalizes email casing/whitespace', () => {
    const result = registerSchema.parse({
      email: '  User@Example.com ',
      password: 'longenoughpassword',
      fullName: 'Jane Doe',
    });
    expect(result.email).toBe('user@example.com');
  });

  it('rejects unknown fields (mass-assignment guard)', () => {
    expect(() =>
      registerSchema.parse({
        email: 'user@example.com',
        password: 'longenoughpassword',
        fullName: 'Jane Doe',
        isSuperadmin: true,
      }),
    ).toThrow();
  });

  it('rejects a too-short password', () => {
    expect(() =>
      registerSchema.parse({ email: 'user@example.com', password: 'short', fullName: 'Jane' }),
    ).toThrow();
  });
});

describe('loginSchema', () => {
  it('rejects an empty password', () => {
    expect(() => loginSchema.parse({ email: 'user@example.com', password: '' })).toThrow();
  });
});

describe('isSafeRedirectPath', () => {
  it('allows an internal path', () => {
    expect(isSafeRedirectPath('/account/reservations')).toBe(true);
  });

  it('allows root path', () => {
    expect(isSafeRedirectPath('/')).toBe(true);
  });

  it('allows path with query string and hash', () => {
    expect(isSafeRedirectPath('/salons?city=Baku#services')).toBe(true);
  });

  it('rejects a protocol-relative URL (//)', () => {
    expect(isSafeRedirectPath('//evil.example.com')).toBe(false);
  });

  // SEC-003 regression: backslash bypass was passing the old /^\/(?!\/)/ regex
  it('rejects a backslash bypass (/\\\\evil.com)', () => {
    expect(isSafeRedirectPath('/\\evil.com')).toBe(false);
  });

  it('rejects an absolute external URL', () => {
    expect(isSafeRedirectPath('https://evil.example.com')).toBe(false);
  });

  it('rejects a relative path without leading slash', () => {
    expect(isSafeRedirectPath('evil.com/path')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isSafeRedirectPath('')).toBe(false);
  });

  it('rejects javascript: URI', () => {
    expect(isSafeRedirectPath('javascript:alert(1)')).toBe(false);
  });
});
