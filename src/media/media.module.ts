import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { ProductsModule } from '../products/products.module.js';
import { UploadMediaAssetUseCase } from './application/upload-media-asset.use-case.js';
import { MediaController } from './infra/controllers/media.controller.js';
import { MediaAssetRepository } from './domain/media-asset.repository.interface.js';
import { PrismaMediaAssetRepository } from './infra/repositories/prisma-media-asset.repository.js';
import { MediaAssetUrlProvider } from './domain/media-asset-url-provider.interface.js';
import { SignedMediaAssetUrlProvider } from './infra/services/signed-media-asset-url.provider.js';
import { PublicMediaAssetController } from './infra/controllers/public-media-asset.controller.js';

@Module({
  imports: [PrismaModule, StorageModule, ProductsModule],
  controllers: [MediaController, PublicMediaAssetController],
  providers: [
    UploadMediaAssetUseCase,
    {
      provide: MediaAssetUrlProvider,
      useClass: SignedMediaAssetUrlProvider,
    },
    {
      provide: MediaAssetRepository,
      useClass: PrismaMediaAssetRepository,
    },
  ],
  exports: [MediaAssetRepository, MediaAssetUrlProvider],
})
export class MediaModule {}
