import { describe, expect, it, vi } from 'vitest';
import { GenerateVideoUseCase } from './application/generate-video.use-case.js';
import { GetVideoGenerationStatusUseCase } from './application/get-video-generation-status.use-case.js';
import { VideoAsset } from './domain/video-asset.entity.js';

describe('video generation use cases', () => {
  it('creates a queued video asset and persists the final upload when the provider completes', async () => {
    const content = {
      id: 'content-1',
      companyId: 'company-1',
      brandId: 'brand-1',
      productId: 'product-1',
      title: 'Launch video',
      slug: 'launch-video',
      script: 'Show the product',
      status: 'DRAFT',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const contentRepo = {
      findById: vi.fn().mockResolvedValue(content),
    };

    const storageProvider = {
      upload: vi.fn().mockResolvedValue({
        key: 'videos/launch-video.mp4',
        url: 'file:///tmp/launch-video.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 1024,
      }),
      delete: vi.fn(),
    };

    const provider = {
      createRenderJob: vi.fn().mockResolvedValue({
        renderJobId: 'job-1',
        status: 'READY',
        finalUrl: 'https://example.com/video.mp4',
        metadata: { format: 'mp4' },
      }),
      getRenderStatus: vi.fn(),
      fetchFinalVideo: vi.fn().mockResolvedValue(Buffer.from('video-data')),
    };

    const repo = {
      create: vi.fn(async (asset: VideoAsset) => asset),
      update: vi.fn(async (asset: VideoAsset) => asset),
      findById: vi.fn(),
      findByContent: vi.fn(),
      findByCompany: vi.fn(),
    };

    const useCase = new GenerateVideoUseCase(
      contentRepo as any,
      repo as any,
      provider as any,
      storageProvider as any,
    );

    const result = await useCase.execute({
      companyId: 'company-1',
      contentId: 'content-1',
      sourceMediaAssetIds: ['asset-1'],
    });

    expect(result.status).toBe('READY');
    expect(provider.createRenderJob).toHaveBeenCalledTimes(1);
    expect(storageProvider.upload).toHaveBeenCalledTimes(1);
    expect(repo.create).toHaveBeenCalledTimes(1);
  });

  it('refreshes status and records the latest render result for the asset', async () => {
    const asset = new VideoAsset(
      'video-1',
      'company-1',
      'content-1',
      'CREATOMATE',
      'QUEUED',
      'job-1',
      null,
      'video/mp4',
      null,
      null,
      { provider: 'creatomate' },
      null,
      new Date(),
      new Date(),
    );

    const repo = {
      create: vi.fn(),
      update: vi.fn(async (updatedAsset: VideoAsset) => updatedAsset),
      findById: vi.fn().mockResolvedValue(asset),
      findByContent: vi.fn(),
      findByCompany: vi.fn(),
    };

    const provider = {
      createRenderJob: vi.fn(),
      getRenderStatus: vi.fn().mockResolvedValue({
        renderJobId: 'job-1',
        status: 'READY',
        finalUrl: 'https://example.com/video.mp4',
        metadata: { format: 'mp4' },
      }),
      fetchFinalVideo: vi.fn(),
    };

    const useCase = new GetVideoGenerationStatusUseCase(repo as any, provider as any);
    const result = await useCase.execute({ companyId: 'company-1', videoAssetId: 'video-1' });

    expect(result.status).toBe('READY');
    expect(provider.getRenderStatus).toHaveBeenCalledWith('job-1');
    expect(repo.update).toHaveBeenCalledTimes(1);
  });
});
