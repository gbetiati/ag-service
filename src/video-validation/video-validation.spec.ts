import { describe, expect, it, vi } from 'vitest';
import { ValidateVideoUseCase } from './application/validate-video.use-case.js';
import { GetValidationReportUseCase } from './application/get-validation-report.use-case.js';
import { ContentValidation, ValidationResult } from './domain/content-validation.entity.js';

describe('video validation use cases', () => {
  it('validates a video asset and returns an approved validation record', async () => {
    const content = {
      id: 'content-1',
      companyId: 'company-1',
      productId: 'product-1',
      title: 'Launch video',
      brief: 'Product launch message',
      slug: 'launch-video',
      script: 'text',
    };

    const videoAsset = {
      id: 'video-1',
      companyId: 'company-1',
      contentId: 'content-1',
      status: 'READY',
      provider: 'CREATOMATE',
      storageKey: 'videos/launch.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 1024,
      errorMessage: null,
    };

    const validationRepo = {
      create: vi.fn(async (validation: ContentValidation) => validation),
      update: vi.fn(async (validation: ContentValidation) => validation),
      findById: vi.fn(),
      findByContent: vi.fn().mockResolvedValue([]),
      findLatestByContent: vi.fn(),
      createResult: vi.fn(async (result: ValidationResult) => result),
      deleteResults: vi.fn(),
      findResults: vi.fn().mockResolvedValue([]),
    };

    const contentRepo = {
      findById: vi.fn().mockResolvedValue(content),
    };

    const videoAssetRepo = {
      findById: vi.fn().mockResolvedValue(videoAsset),
    };

    const storageProvider = {
      upload: vi.fn(),
      download: vi.fn().mockResolvedValue(Buffer.from('fake-video')),
      delete: vi.fn(),
    };

    const processing = {
      downloadVideo: vi.fn().mockResolvedValue({ path: '/tmp/video.mp4', sizeBytes: 42, mimeType: 'video/mp4' }),
      validateVideoIntegrity: vi.fn().mockResolvedValue({ isValid: true, reason: 'ok', technicalMetadata: { width: 1920 } }),
      collectTechnicalMetadata: vi.fn().mockResolvedValue({ width: 1920, height: 1080 }),
    };

    const extraction = { extractRepresentativeFrames: vi.fn().mockResolvedValue(['/tmp/frame-001.jpg']) };
    const ocr = { runOcr: vi.fn().mockResolvedValue({ detectedText: ['Mug 39'], confidence: 0.9, source: 'tesseract' }) };
    const vision = { analyzeFrames: vi.fn().mockResolvedValue({ summary: 'ok', issues: [], confidence: 0.9, detectedObjects: ['product'] }) };
    const audio = { transcribe: vi.fn().mockResolvedValue({ transcript: 'hello', confidence: 0.7, source: 'ffmpeg' }) };
    const productVerification = { verifyProductMatch: vi.fn().mockResolvedValue({ passed: true, matchedProducts: ['Mug'], missingProducts: [], summary: 'matched' }) };
    const policy = { evaluate: vi.fn().mockResolvedValue({ passed: true, violations: [], summary: 'policy ok' }) };
    const aggregator = { aggregate: vi.fn().mockResolvedValue({ status: 'APPROVED', summary: 'all good', isApproved: true }) };
    const productRepo = { findByCompany: vi.fn().mockResolvedValue([{ name: 'Mug' }]) };

    const useCase = new ValidateVideoUseCase(
      contentRepo as any,
      videoAssetRepo as any,
      validationRepo as any,
      storageProvider as any,
      processing as any,
      extraction as any,
      ocr as any,
      vision as any,
      audio as any,
      productVerification as any,
      policy as any,
      aggregator as any,
      productRepo as any,
    );

    const result = await useCase.execute({ companyId: 'company-1', contentId: 'content-1', videoAssetId: 'video-1' });

    expect(result.status).toBe('APPROVED');
    expect(validationRepo.create).toHaveBeenCalledTimes(1);
    expect(validationRepo.createResult).toHaveBeenCalledTimes(6);
  });

  it('returns the latest validation report for the content', async () => {
    const validation = new ContentValidation(
      'validation-1',
      'company-1',
      'content-1',
      'video-1',
      'APPROVED',
      'video-validation-v1',
      'all good',
      null,
      new Date(),
      new Date(),
      new Date(),
      new Date(),
    );

    const repo = {
      findLatestByContent: vi.fn().mockResolvedValue(validation),
      findResults: vi.fn().mockResolvedValue([
        new (class extends Object {
          constructor() {
            super();
          }
        })(),
      ]),
    };

    const useCase = new GetValidationReportUseCase(repo as any);
    const result = await useCase.execute({ companyId: 'company-1', contentId: 'content-1' });

    expect(result.validation.status).toBe('APPROVED');
    expect(result.validation.companyId).toBe('company-1');
  });
});
