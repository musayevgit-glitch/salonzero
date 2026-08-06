import { describe, expect, it } from 'vitest';
import { detectImageMime } from './image-signature';

describe('detectImageMime', () => {
  it('detects a JPEG by magic bytes', () => {
    expect(detectImageMime(Buffer.from([0xff, 0xd8, 0xff, 0x00]))).toBe('image/jpeg');
  });

  it('detects a PNG by magic bytes', () => {
    expect(detectImageMime(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(
      'image/png',
    );
  });

  it('detects a WEBP by RIFF/WEBP markers', () => {
    const buf = Buffer.concat([
      Buffer.from('RIFF', 'ascii'),
      Buffer.from([0, 0, 0, 0]),
      Buffer.from('WEBP', 'ascii'),
    ]);
    expect(detectImageMime(buf)).toBe('image/webp');
  });

  it('rejects an SVG (XML text) despite an image/svg+xml claim', () => {
    expect(
      detectImageMime(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')),
    ).toBeNull();
  });

  it('rejects an executable disguised with an image extension', () => {
    expect(detectImageMime(Buffer.from([0x4d, 0x5a, 0x90, 0x00]))).toBeNull(); // MZ header
  });

  it('rejects an empty buffer', () => {
    expect(detectImageMime(Buffer.alloc(0))).toBeNull();
  });
});
