import { Global, Module } from '@nestjs/common';
import {
  createStorageAdapter,
  LocalDiskStorageAdapter,
  type StorageAdapter,
} from '@salonomia/storage';
import { LOCAL_DISK_ADAPTER, STORAGE_ADAPTER } from './storage.tokens';

@Global()
@Module({
  providers: [
    { provide: STORAGE_ADAPTER, useFactory: (): StorageAdapter => createStorageAdapter() },
    {
      provide: LOCAL_DISK_ADAPTER,
      useFactory: (adapter: StorageAdapter): LocalDiskStorageAdapter | null =>
        adapter instanceof LocalDiskStorageAdapter ? adapter : null,
      inject: [STORAGE_ADAPTER],
    },
  ],
  exports: [STORAGE_ADAPTER, LOCAL_DISK_ADAPTER],
})
export class StorageModule {}
