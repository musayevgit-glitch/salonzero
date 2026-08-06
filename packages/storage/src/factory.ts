import { LocalDiskStorageAdapter } from './local-disk-adapter';
import { S3StorageAdapter } from './s3-adapter';
import type { StorageAdapter } from './adapter';

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name} for the configured STORAGE_DRIVER.`);
  }
  return value;
}

/**
 * Fails closed: throws rather than silently falling back to an insecure or misconfigured driver.
 * Defaults to the local driver, matching this environment's "no Docker/S3" baseline (ADR-0008).
 */
export function createStorageAdapter(env: NodeJS.ProcessEnv = process.env): StorageAdapter {
  const driver = env.STORAGE_DRIVER === 's3' ? 's3' : 'local';

  if (driver === 's3') {
    return new S3StorageAdapter({
      bucket: required(env, 'S3_BUCKET'),
      region: required(env, 'S3_REGION'),
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: env.S3_FORCE_PATH_STYLE === 'true',
      accessKeyId: required(env, 'S3_ACCESS_KEY_ID'),
      secretAccessKey: required(env, 'S3_SECRET_ACCESS_KEY'),
    });
  }

  return new LocalDiskStorageAdapter({
    baseDir: env.LOCAL_STORAGE_DIR ?? '.local-storage',
    signingSecret: required(env, 'LOCAL_STORAGE_SIGNING_SECRET'),
    publicBaseUrl: env.LOCAL_STORAGE_PUBLIC_BASE_URL ?? 'http://localhost:4000/uploads',
  });
}
