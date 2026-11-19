import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ContentRepository } from '../../content/domain/content.repository.interface.js';
import { VideoAssetRepository } from '../../video-generation/domain/video-asset.repository.interface.js';
import { StorageProvider } from '../../storage/domain/storage-provider.interface.js';
import { ContentValidation, ValidationResult } from '../domain/content-validation.entity.js';
import { ContentValidationRepository } from '../domain/content-validation.repository.interface.js';
import { ValidationStatus } from '../domain/validation-status.type.js';
import { VideoProcessingService } from '../domain/video-processing.service.interface.js';
import { FrameExtractionService } from '../domain/frame-extraction.service.interface.js';
import { OcrService } from '../domain/ocr.service.interface.js';
import { VideoVisionService } from '../domain/video-vision.service.interface.js';
import { AudioTranscriptionService } from '../domain/audio-transcription.service.interface.js';
import { ProductVerificationService } from '../domain/product-verification.service.interface.js';
import { ContentPolicyService } from '../domain/content-policy.service.interface.js';
import { ValidationAggregatorService } from '../domain/validation-aggregator.service.interface.js';
import { ProductRepository } from '../../products/domain/product.repository.interface.js';

export type ValidateVideoInput = {
  companyId: string;
  contentId: string;
  videoAssetId: string;
  requireRealEvidence?: boolean;
};

@Injectable()
export class ValidateVideoUseCase {
  private readonly logger = new Logger(ValidateVideoUseCase.name);

  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly videoAssetRepository: VideoAssetRepository,
    private readonly validationRepository: ContentValidationRepository,
    private readonly storageProvider: StorageProvider,
    private readonly videoProcessingService: VideoProcessingService,
    private readonly frameExtractionService: FrameExtractionService,
    private readonly ocrService: OcrService,
    private readonly videoVisionService: VideoVisionService,
    private readonly audioTranscriptionService: AudioTranscriptionService,
    private readonly productVerificationService: ProductVerificationService,
    private readonly contentPolicyService: ContentPolicyService,
    private readonly validationAggregatorService: ValidationAggregatorService,
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(input: ValidateVideoInput): Promise<ContentValidation> {
    const content = await this.contentRepository.findById(input.contentId);
    if (!content || content.companyId !== input.companyId) {
      throw new NotFoundException('Content not found in company');
    }

    const videoAsset = await this.videoAssetRepository.findById(input.videoAssetId);
    if (!videoAsset || videoAsset.companyId !== input.companyId || videoAsset.contentId !== input.contentId) {
      throw new NotFoundException('Video asset not found for this content');
    }
    if (videoAsset.status !== 'READY' || !videoAsset.storageKey) {
      throw new NotFoundException('Video asset must be ready and stored before validation');
    }

    const existingValidation = (await this.validationRepository.findByContent(input.contentId)).find(
      (validation) => validation.videoAssetId === input.videoAssetId,
    );
    const now = new Date();
    const processingValidation = existingValidation
      ? new ContentValidation(
          existingValidation.id,
          input.companyId,
          input.contentId,
          input.videoAssetId,
          'PROCESSING',
          'video-validation-v1',
          null,
          null,
          now,
          null,
          existingValidation.createdAt,
          now,
        )
      : ContentValidation.create({
          companyId: input.companyId,
          contentId: input.contentId,
          videoAssetId: input.videoAssetId,
          status: 'PROCESSING',
          validatorVersion: 'video-validation-v1',
          startedAt: now,
        });

    if (existingValidation) {
      await this.validationRepository.deleteResults(existingValidation.id);
    }
    const persistedValidation = existingValidation
      ? await this.validationRepository.update(processingValidation)
      : await this.validationRepository.create(processingValidation);

    let cleanupVideo: (() => Promise<void>) | undefined;
    let frameDir: string | undefined;
    try {
      const storageInfo = await this.videoProcessingService.downloadVideo(videoAsset.storageKey ?? '');
      cleanupVideo = storageInfo.cleanup;
      const integrity = await this.videoProcessingService.validateVideoIntegrity(storageInfo.path);
      const technicalMetadata = await this.videoProcessingService.collectTechnicalMetadata(storageInfo.path);

      frameDir = await mkdtemp(join(tmpdir(), 'ag-validation-'));
      const frames = await this.frameExtractionService.extractRepresentativeFrames(storageInfo.path, frameDir);
      const ocr = await this.ocrService.runOcr(frames);
      const vision = await this.videoVisionService.analyzeFrames(frames);
      const transcript = await this.audioTranscriptionService.transcribe(storageInfo.path);

      const productNames = await this.productRepository.findByCompany(input.companyId).then((products) => products.map((product) => product.name));
      const productVerification = await this.productVerificationService.verifyProductMatch(
        {
          productId: content.productId,
          title: content.title,
          brief: content.brief,
        },
        productNames,
        ocr.detectedText,
      );

      const policy = await this.contentPolicyService.evaluate(
        {
          title: content.title,
          brief: content.brief,
        },
        ocr.detectedText,
        productNames,
      );

      const aggregated = await this.validationAggregatorService.aggregate({
        integrity: {
          isValid: integrity.isValid,
          reason: integrity.reason,
          technicalMetadata,
        },
        ocr,
        vision,
        transcript,
        productVerification,
        policy,
      });

      const visionPassed = vision.confidence > 0.5 && (!input.requireRealEvidence || vision.source === 'multimodal');
      const audioPassed = transcript.source === 'no-audio'
        || (transcript.confidence > 0.1 && (!input.requireRealEvidence || transcript.source === 'transcription'));
      const missingEvidence = input.requireRealEvidence
        && (!visionPassed || !audioPassed || ocr.source !== 'tesseract');
      const resultStatus: ValidationStatus = aggregated.status === 'APPROVED' && missingEvidence ? 'INCONCLUSIVE' : aggregated.status;
      const finalValidation = new ContentValidation(
        persistedValidation.id,
        persistedValidation.companyId,
        persistedValidation.contentId,
        persistedValidation.videoAssetId,
        resultStatus,
        persistedValidation.validatorVersion,
        missingEvidence ? 'The scheduled video is missing required validation evidence.' : aggregated.summary,
        [
          aggregated.failureReason,
          ...(missingEvidence && !visionPassed ? ['Real multimodal evidence is unavailable.'] : []),
          ...(missingEvidence && !audioPassed ? ['Audio transcription is unavailable or the audio stream could not be verified.'] : []),
          ...(missingEvidence && ocr.source !== 'tesseract' ? ['OCR evidence is unavailable.'] : []),
        ].filter(Boolean).join(' ') || null,
        persistedValidation.startedAt,
        new Date(),
        persistedValidation.createdAt,
        new Date(),
      );

      const results = [
        new ValidationResult(crypto.randomUUID(), finalValidation.id, 'integrity', integrity.isValid ? 'APPROVED' : 'FAILED', integrity.isValid, integrity.isValid ? 1 : 0, { reason: integrity.reason ?? 'Valid' }, { technicalMetadata }, new Date()),
        new ValidationResult(crypto.randomUUID(), finalValidation.id, 'ocr', ocr.detectedText.length > 0 ? 'APPROVED' : 'INCONCLUSIVE', ocr.detectedText.length > 0, Number((ocr.confidence ?? 0).toFixed(2)), { text: ocr.detectedText }, { source: ocr.source }, new Date()),
        new ValidationResult(crypto.randomUUID(), finalValidation.id, 'vision', visionPassed ? 'APPROVED' : 'INCONCLUSIVE', visionPassed, Number(vision.confidence.toFixed(2)), { issues: vision.issues }, { detectedObjects: vision.detectedObjects, ...(vision.source ? { source: vision.source } : {}) }, new Date()),
        new ValidationResult(crypto.randomUUID(), finalValidation.id, 'audio', audioPassed ? 'APPROVED' : 'INCONCLUSIVE', audioPassed, Number(transcript.confidence.toFixed(2)), { transcript }, { source: transcript.source }, new Date()),
        new ValidationResult(crypto.randomUUID(), finalValidation.id, 'product', productVerification.passed ? 'APPROVED' : 'REJECTED', productVerification.passed, productVerification.matchedProducts.length > 0 ? 1 : 0, { summary: productVerification.summary }, { matchedProducts: productVerification.matchedProducts, missingProducts: productVerification.missingProducts }, new Date()),
        new ValidationResult(crypto.randomUUID(), finalValidation.id, 'policy', policy.passed ? 'APPROVED' : 'REJECTED', policy.passed, policy.passed ? 1 : 0, { summary: policy.summary }, { violations: policy.violations }, new Date()),
      ];

      for (const result of results) {
        await this.validationRepository.createResult(result);
      }

      return this.validationRepository.update(finalValidation);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown validation error';
      const failedValidation = new ContentValidation(
        persistedValidation.id,
        persistedValidation.companyId,
        persistedValidation.contentId,
        persistedValidation.videoAssetId,
        'FAILED',
        persistedValidation.validatorVersion,
        'Validation failed while processing the video.',
        reason,
        persistedValidation.startedAt,
        new Date(),
        persistedValidation.createdAt,
        new Date(),
      );
      await this.validationRepository.update(failedValidation);
      throw new Error(reason);
    } finally {
      const cleanup = await Promise.allSettled([
        cleanupVideo?.(),
        frameDir ? rm(frameDir, { recursive: true, force: true }) : undefined,
      ]);
      if (cleanup.some((result) => result.status === 'rejected')) {
        this.logger.warn(`Could not remove all temporary files for validation ${persistedValidation.id}.`);
      }
    }
  }
}
