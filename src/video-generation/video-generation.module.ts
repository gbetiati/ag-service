import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { ContentModule } from '../content/content.module.js';
import { GenerateVideoUseCase } from './application/generate-video.use-case.js';
import { RenderVideoUseCase } from './application/render-video.use-case.js';
import { GetVideoGenerationStatusUseCase } from './application/get-video-generation-status.use-case.js';
import { VideoAssetRepository } from './domain/video-asset.repository.interface.js';
import { VideoProvider } from './domain/video-provider.interface.js';
import { CreatomateProvider } from './infra/providers/creatomate.provider.js';
import { PrismaVideoAssetRepository } from './infra/repositories/prisma-video-asset.repository.js';
import { VideoGenerationController } from './infra/controllers/video-generation.controller.js';

@Module({
  imports: [PrismaModule, StorageModule, ConfigModule, ContentModule],
  controllers: [VideoGenerationController],
  providers: [
    GenerateVideoUseCase,
    RenderVideoUseCase,
    GetVideoGenerationStatusUseCase,
    {
      provide: VideoProvider,
      useClass: CreatomateProvider,
    },
    {
      provide: VideoAssetRepository,
      useClass: PrismaVideoAssetRepository,
    },
  ],
  exports: [VideoAssetRepository],
})
export class VideoGenerationModule {}
