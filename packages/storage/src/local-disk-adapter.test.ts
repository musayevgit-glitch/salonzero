import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LocalDiskStorageAdapter } from './local-disk-adapter';

const VALID_KEY =
  'employees/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222.jpg';

describe('LocalDiskStorageAdapter', () => {
  let baseDir: string;
  let adapter: LocalDiskStorageAdapter;

  beforeEach(() => {
    baseDir = mkdtempSync(join(tmpdir(), 'salonomia-storage-test-'));
    adapter = new LocalDiskStorageAdapter({
      baseDir,
      signingSecret: 'test-secret',
      publicBaseUrl: 'http://localhost:4000/uploads',
    });
  });

  afterEach(() => {
    rmSync(baseDir, { recursive: true, force: true });
  });

  it('rejects a path-traversal object key', () => {
    expect(() => adapter.resolvePath('../../etc/passwd')).toThrow();
    expect(() => adapter.resolvePath('employees/../../../etc/passwd')).toThrow();
  });

  it('rejects an object key with a disallowed extension', () => {
    expect(() =>
      adapter.resolvePath('employees/11111111-1111-1111-1111-111111111111/x.svg'),
    ).toThrow();
  });

  it('writes and reads back object bytes, and stats the size', async () => {
    const data = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01, 0x02]);
    await adapter.writeObject(VALID_KEY, Readable.from(data));

    const stat = await adapter.statObject(VALID_KEY);
    expect(stat?.sizeBytes).toBe(data.length);

    const head = await adapter.readObjectHead(VALID_KEY, 3);
    expect(head).toEqual(Buffer.from([0xff, 0xd8, 0xff]));
  });

  it('returns null stat/head for a nonexistent object', async () => {
    expect(await adapter.statObject(VALID_KEY)).toBeNull();
    expect(await adapter.readObjectHead(VALID_KEY, 3)).toBeNull();
  });

  it('deleteObject is idempotent for a missing file', async () => {
    await expect(adapter.deleteObject(VALID_KEY)).resolves.toBeUndefined();
  });

  it('aborts and removes the partial file when the stream exceeds the size limit', async () => {
    const data = Buffer.alloc(1000, 1);
    await expect(adapter.writeObjectWithLimit(VALID_KEY, Readable.from(data), 100)).rejects.toThrow(
      /size limit/,
    );
    expect(await adapter.statObject(VALID_KEY)).toBeNull();
  });

  it('writeObjectWithLimit accepts data within the limit', async () => {
    const data = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    await adapter.writeObjectWithLimit(VALID_KEY, Readable.from(data), 100);
    expect((await adapter.statObject(VALID_KEY))?.sizeBytes).toBe(data.length);
  });

  it('produces a signed, time-limited upload URL', async () => {
    const target = await adapter.createUploadTarget(VALID_KEY, 'image/jpeg', 5_000_000);
    expect(target.method).toBe('PUT');
    expect(target.url.startsWith('http://localhost:4000/uploads/')).toBe(true);
    expect(target.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});
