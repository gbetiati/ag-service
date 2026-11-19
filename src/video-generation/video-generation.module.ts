import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { ContentModule } from '../content/content.module.js';
import { MediaModule } from '../media/media.module.js';
import { GenerateVideoUseCase } from './application/generate-video.use-case.js';
import { RenderVideoUseCase } from './application/render-video.use-case.js';
import { GetVideoGenerationStatusUseCase } from './application/get-video-generation-status.use-case.js';
import { GetVideoGenerationJobsUseCase } from './application/get-video-generation-jobs.use-case.js';
import { GetVideoGenerationDetailsUseCase } from './application/get-video-generation-details.use-case.js';
import { ProcessVideoGenerationUseCase } from './application/process-video-generation.use-case.js';
import { VideoAssetRepository } from './domain/video-asset.repository.interface.js';
import { VideoGenerationRepository } from './domain/video-generation.repository.interface.js';
import { VideoGenerationQueue } from './domain/video-generation-queue.interface.js';
import { VideoProvider } from './domain/video-provider.interface.js';
import { CreatomateProvider } from './infra/providers/creatomate.provider.js';
import { PrismaVideoAssetRepository } from './infra/repositories/prisma-video-asset.repository.js';
import { PrismaVideoGenerationRepository } from './infra/repositories/prisma-video-generation.repository.js';
import { VideoGenerationController } from './infra/controllers/video-generation.controller.js';
import { VideoGenerationQueueController } from './infra/controllers/video-generation-queue.controller.js';
import { BullMqVideoGenerationQueue } from './infra/services/bullmq-video-generation.queue.js';
import { VideoGenerationProcessor } from './infra/processors/video-generation.processor.js';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    ConfigModule,
    ContentModule,
    MediaModule,
  ],
  controllers: [VideoGenerationController, VideoGenerationQueueController],
  providers: [
    GenerateVideoUseCase,
    ProcessVideoGenerationUseCase,
    RenderVideoUseCase,
    GetVideoGenerationStatusUseCase,
    GetVideoGenerationJobsUseCase,
    GetVideoGenerationDetailsUseCase,
    VideoGenerationProcessor,
    {
      provide: VideoProvider,
      useClass: CreatomateProvider,
    },
    {
      provide: VideoAssetRepository,
      useClass: PrismaVideoAssetRepository,
    },
    {
      provide: VideoGenerationRepository,
      useClass: PrismaVideoGenerationRepository,
    },
    {
      provide: VideoGenerationQueue,
      useClass: BullMqVideoGenerationQueue,
    },
  ],
  exports: [VideoAssetRepository, VideoGenerationRepository, ProcessVideoGenerationUseCase],
})
export class VideoGenerationModule {}
