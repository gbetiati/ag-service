import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CompaniesModule } from '../companies/companies.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { ContentModule } from '../content/content.module.js';
import { ProductsModule } from '../products/products.module.js';
import { VideoGenerationModule } from '../video-generation/video-generation.module.js';
import { ValidateVideoUseCase } from './application/validate-video.use-case.js';
import { ApplyValidationApprovalUseCase } from './application/apply-validation-approval.use-case.js';
import { GetValidationReportUseCase } from './application/get-validation-report.use-case.js';
import { RevalidateVideoUseCase } from './application/revalidate-video.use-case.js';
import { ContentValidationRepository } from './domain/content-validation.repository.interface.js';
import { VideoProcessingService } from './domain/video-processing.service.interface.js';
import { FrameExtractionService } from './domain/frame-extraction.service.interface.js';
import { OcrService } from './domain/ocr.service.interface.js';
import { VideoVisionService } from './domain/video-vision.service.interface.js';
import { AudioTranscriptionService } from './domain/audio-transcription.service.interface.js';
import { ProductVerificationService } from './domain/product-verification.service.interface.js';
import { ContentPolicyService } from './domain/content-policy.service.interface.js';
import { ValidationAggregatorService } from './domain/validation-aggregator.service.interface.js';
import { PrismaContentValidationRepository } from './infra/repositories/prisma-content-validation.repository.js';
import { FfmpegVideoProcessingService } from './infra/services/ffmpeg-video-processing.service.js';
import { FfmpegFrameExtractionService } from './infra/services/ffmpeg-frame-extraction.service.js';
import { TesseractOcrService } from './infra/services/tesseract-ocr.service.js';
import { VisionAnalysisService } from './infra/services/vision-analysis.service.js';
import { AudioTranscriptionServiceImpl } from './infra/services/audio-transcription.service.js';
import { ProductVerificationServiceImpl } from './infra/services/product-verification.service.js';
import { ContentPolicyServiceImpl } from './infra/services/content-policy.service.js';
import { ValidationAggregatorServiceImpl } from './infra/services/validation-aggregator.service.js';
import { VideoValidationController } from './infra/controllers/video-validation.controller.js';
import { VideoValidationProcessor } from './infra/processors/video-validation.processor.js';

import { ScheduledPublicationPersistenceModule } from '../scheduling/infra/scheduled-publication-persistence.module.js';

@Module({
  imports: [
    ScheduledPublicationPersistenceModule,PrismaModule, StorageModule, ContentModule, ProductsModule, VideoGenerationModule, CompaniesModule],
  controllers: [VideoValidationController],
  providers: [
    ValidateVideoUseCase,
    ApplyValidationApprovalUseCase,
    VideoValidationProcessor,
    GetValidationReportUseCase,
    RevalidateVideoUseCase,
    {
      provide: ContentValidationRepository,
      useClass: PrismaContentValidationRepository,
    },
    {
      provide: VideoProcessingService,
      useClass: FfmpegVideoProcessingService,
    },
    {
      provide: FrameExtractionService,
      useClass: FfmpegFrameExtractionService,
    },
    {
      provide: OcrService,
      useClass: TesseractOcrService,
    },
    {
      provide: VideoVisionService,
      useClass: VisionAnalysisService,
    },
    {
      provide: AudioTranscriptionService,
      useClass: AudioTranscriptionServiceImpl,
    },
    {
      provide: ProductVerificationService,
      useClass: ProductVerificationServiceImpl,
    },
    {
      provide: ContentPolicyService,
      useClass: ContentPolicyServiceImpl,
    },
    {
      provide: ValidationAggregatorService,
      useClass: ValidationAggregatorServiceImpl,
    },
  ],
  exports: [ContentValidationRepository],
})
export class VideoValidationModule {}
