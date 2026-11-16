import { Module } from '@nestjs/common';
import { LocalStorageProvider } from './infra/local-storage.provider.js';
import { StorageProvider } from './domain/storage-provider.interface.js';

@Module({
  providers: [
    {
      provide: StorageProvider,
      useClass: LocalStorageProvider,
    },
  ],
  exports: [StorageProvider],
})
export class StorageModule {}
