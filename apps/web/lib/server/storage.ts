import { createStorageAdapter } from '@salonomia/storage';

let storageAdapter: ReturnType<typeof createStorageAdapter> | null = null;

export function getStorageAdapter() {
  if (!storageAdapter) {
    storageAdapter = createStorageAdapter(process.env);
  }
  return storageAdapter;
}
