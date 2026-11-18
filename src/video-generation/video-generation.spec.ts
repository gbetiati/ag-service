import { describe, expect, it, vi } from 'vitest';
import { GenerateVideoUseCase } from './application/generate-video.use-case.js';
import { GetVideoGenerationJobsUseCase } from './application/get-video-generation-jobs.use-case.js';
import { GetVideoGenerationStatusUseCase } from './application/get-video-generation-status.use-case.js';
import { ProcessVideoGenerationUseCase } from './application/process-video-generation.use-case.js';
import { VideoAsset } from './domain/video-asset.entity.js';
import { VideoGeneration } from './domain/video-generation.entity.js';
import { Readable } from 'node:stream';

const makeContent = () => ({
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
});

describe('video generation use cases', () => {
  it('persists a generation and enqueues it without calling the provider in the request', async () => {
    const contentRepo = { findById: vi.fn().mockResolvedValue(makeContent()) };
    const repo = {
      create: vi.fn(async (generation: VideoGeneration) => generation),
      update: vi.fn(async (generation: VideoGeneration) => generation),
    };
    const queue = {
      enqueue: vi.fn().mockResolvedValue({ jobId: 'video-generation-video-1' }),
    };

    const useCase = new GenerateVideoUseCase(
      contentRepo as any,
      repo as any,
      queue as any,
    );
    const result = await useCase.execute({
      companyId: 'company-1',
      contentId: 'content-1',
      sourceMediaAssetIds: ['asset-1'],
    });

    expect(result.status).toBe('QUEUED');
    expect(result.request).toMatchObject({
      sourceMediaAssetIds: ['asset-1'],
      outputFormat: 'mp4',
    });
    expect(repo.create).toHaveBeenCalledTimes(1);
    expect(queue.enqueue).toHaveBeenCalledWith({
      companyId: 'company-1',
      videoGenerationId: result.id,
    });
  });

  it('marks the generation failed and rethrows when Redis cannot enqueue the job', async () => {
    const generationUpdates: VideoGeneration[] = [];
    const repo = {
      create: vi.fn(async (generation: VideoGeneration) => generation),
      update: vi.fn(async (generation: VideoGeneration) => {
        generationUpdates.push(generation);
        return generation;
      }),
    };
    const useCase = new GenerateVideoUseCase(
      { findById: vi.fn().mockResolvedValue(makeContent()) } as any,
      repo as any,
      {
        enqueue: vi.fn().mockRejectedValue(new Error('Redis unavailable')),
      } as any,
    );

    await expect(
      useCase.execute({ companyId: 'company-1', contentId: 'content-1' }),
    ).rejects.toThrow('Redis unavailable');
    expect(generationUpdates[0]?.status).toBe('FAILED');
    expect(generationUpdates[0]?.errorMessage).toBe('Redis unavailable');
  });

  it('renders, stores, then creates the final video asset in the worker', async () => {
    const content = makeContent();
    const generation = VideoGeneration.create({
      companyId: 'company-1',
      contentId: content.id,
      provider: 'CREATOMATE',
      request: { sourceMediaAssetIds: ['asset-1'], outputFormat: 'mp4' },
    });
    const generationRepo = {
      findById: vi.fn().mockResolvedValue(generation),
      update: vi.fn(async (updated: VideoGeneration) => updated),
    };
    const assetRepo = {
      findById: vi.fn().mockResolvedValue(null),
      create: vi.fn(async (asset: VideoAsset) => asset),
    };
    const provider = {
      createRenderJob: vi.fn().mockResolvedValue({
        renderJobId: 'render-1',
        status: 'READY',
        metadata: { format: 'mp4' },
      }),
      getRenderStatus: vi.fn(),
      fetchFinalVideo: vi
        .fn()
        .mockResolvedValue(Readable.from(Buffer.from('video-data'))),
    };
    const mediaAsset = {
      id: 'asset-1',
      companyId: 'company-1',
      kind: 'IMAGE',
      mimeType: 'image/jpeg',
    };
    const mediaAssetRepo = {
      findById: vi.fn().mockResolvedValue(mediaAsset),
      findByProduct: vi.fn().mockResolvedValue([mediaAsset]),
    };
    const mediaAssetUrlProvider = {
      createUrl: vi
        .fn()
        .mockReturnValue(
          'https://api.example.com/media-assets/asset-1/public?signature=signed',
        ),
    };
    const storage = {
      upload: vi.fn().mockResolvedValue({
        key: 'videos/launch-video.mp4',
        url: 'file:///tmp/launch-video.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 1024,
      }),
    };

    const useCase = new ProcessVideoGenerationUseCase(
      { findById: vi.fn().mockResolvedValue(content) } as any,
      generationRepo as any,
      assetRepo as any,
      mediaAssetRepo as any,
      mediaAssetUrlProvider as any,
      provider as any,
      storage as any,
    );

    const result = await useCase.execute({
      companyId: 'company-1',
      videoGenerationId: generation.id,
    });

    expect(provider.createRenderJob).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company-1',
        contentId: 'content-1',
        sourceMediaAssetIds: ['asset-1'],
        sourceMediaUrls: [
          'https://api.example.com/media-assets/asset-1/public?signature=signed',
        ],
      }),
    );
    expect(provider.fetchFinalVideo).toHaveBeenCalledWith('render-1');
    expect(result).toMatchObject({
      status: 'READY',
      renderJobId: 'render-1',
    });
    expect(result.videoAssetId).toBe(generation.id);
    expect(assetRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: generation.id,
        status: 'READY',
        storageKey: 'videos/launch-video.mp4',
        sizeBytes: 1024,
      }),
    );
  });

  it('records a remote render job for later status checks', async () => {
    const content = makeContent();
    const generation = VideoGeneration.create({
      companyId: 'company-1',
      contentId: content.id,
      provider: 'CREATOMATE',
      request: { sourceMediaAssetIds: ['asset-1'] },
    });
    const generationRepo = {
      findById: vi.fn().mockResolvedValue(generation),
      update: vi.fn(async (updated: VideoGeneration) => updated),
    };
    const assetRepo = {
      findById: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
    };
    const provider = {
      createRenderJob: vi.fn().mockResolvedValue({
        renderJobId: 'render-1',
        status: 'QUEUED',
        metadata: {},
      }),
      getRenderStatus: vi.fn(),
      fetchFinalVideo: vi.fn(),
    };

    const useCase = new ProcessVideoGenerationUseCase(
      { findById: vi.fn().mockResolvedValue(content) } as any,
      generationRepo as any,
      assetRepo as any,
      {
        findById: vi.fn().mockResolvedValue({
          id: 'asset-1',
          companyId: 'company-1',
          kind: 'IMAGE',
          mimeType: 'image/jpeg',
        }),
      } as any,
      {
        createUrl: vi
          .fn()
          .mockReturnValue(
            'https://api.example.com/media-assets/asset-1/public?signature=signed',
          ),
      } as any,
      provider as any,
      { upload: vi.fn() } as any,
    );
    const result = await useCase.execute({
      companyId: 'company-1',
      videoGenerationId: generation.id,
    });

    expect(result.status).toBe('RENDERING');
    expect(result.renderJobId).toBe('render-1');
    expect(provider.fetchFinalVideo).not.toHaveBeenCalled();
  });

  it('lists generations and their jobs for the requested company', async () => {
    const generation = VideoGeneration.create({
      companyId: 'company-1',
      contentId: 'content-1',
      provider: 'CREATOMATE',
      request: {},
    });
    const useCase = new GetVideoGenerationJobsUseCase(
      { findByCompany: vi.fn().mockResolvedValue([generation]) } as any,
      {
        getCompanyJobs: vi.fn().mockResolvedValue([
          {
            jobId: 'job-1',
            videoGenerationId: generation.id,
            state: 'waiting',
            failedReason: null,
            createdAt: Date.now(),
          },
        ]),
      } as any,
    );

    await expect(useCase.execute('company-1')).resolves.toEqual([
      {
        videoGenerationId: generation.id,
        contentId: 'content-1',
        status: 'QUEUED',
        videoAssetId: null,
        errorMessage: null,
        jobs: [expect.objectContaining({ state: 'waiting' })],
      },
    ]);
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
      update: vi.fn(async (updatedAsset: VideoAsset) => updatedAsset),
      findById: vi.fn().mockResolvedValue(asset),
    };
    const provider = {
      getRenderStatus: vi.fn().mockResolvedValue({
        renderJobId: 'job-1',
        status: 'READY',
        metadata: { format: 'mp4' },
      }),
    };

    const useCase = new GetVideoGenerationStatusUseCase(
      repo as any,
      provider as any,
    );
    const result = await useCase.execute({
      companyId: 'company-1',
      videoAssetId: 'video-1',
    });

    expect(result.status).toBe('READY');
    expect(provider.getRenderStatus).toHaveBeenCalledWith('job-1');
    expect(repo.update).toHaveBeenCalledTimes(1);
  });
});
