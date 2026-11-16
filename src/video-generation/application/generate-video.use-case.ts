import { Injectable, NotFoundException } from '@nestjs/common';
import { VideoAsset } from '../domain/video-asset.entity.js';
import { VideoAssetRepository } from '../domain/video-asset.repository.interface.js';
import { VideoProvider } from '../domain/video-provider.interface.js';
import { StorageProvider } from '../../storage/domain/storage-provider.interface.js';
import { ContentRepository } from '../../content/domain/content.repository.interface.js';

export type GenerateVideoInput = {
  companyId: string;
  contentId: string;
  sourceMediaAssetIds?: string[];
  provider?: string;
  outputFormat?: string;
};

@Injectable()
export class GenerateVideoUseCase {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly videoAssetRepository: VideoAssetRepository,
    private readonly videoProvider: VideoProvider,
    private readonly storageProvider: StorageProvider,
  ) {}

  async execute(input: GenerateVideoInput): Promise<VideoAsset> {
    const content = await this.contentRepository.findById(input.contentId);
    if (!content || content.companyId !== input.companyId) {
      throw new NotFoundException('Content not found in company');
    }

    const renderResult = await this.videoProvider.createRenderJob({
      companyId: input.companyId,
      contentId: content.id,
      title: content.title,
      script: content.script,
      brandId: content.brandId,
      productId: content.productId,
      sourceMediaAssetIds: input.sourceMediaAssetIds ?? [],
      outputFormat: input.outputFormat ?? 'mp4',
    });

    let uploadedKey: string | null = null;
    let mimeType: string | null = null;
    let sizeBytes: number | null = null;

    if (renderResult.finalUrl) {
      const finalBuffer = await this.videoProvider.fetchFinalVideo(renderResult.renderJobId);
      const upload = await this.storageProvider.upload({
        buffer: finalBuffer,
        originalName: `${content.slug}.mp4`,
        mimeType: 'video/mp4',
        directory: 'videos',
      });
      uploadedKey = upload.key;
      mimeType = upload.mimeType;
      sizeBytes = upload.sizeBytes;
    }

    const asset = VideoAsset.create({
      companyId: input.companyId,
      contentId: content.id,
      provider: input.provider ?? 'CREATOMATE',
      status: renderResult.status === 'FAILED' ? 'FAILED' : renderResult.status === 'READY' ? 'READY' : 'QUEUED',
      renderJobId: renderResult.renderJobId,
      storageKey: uploadedKey,
      mimeType: mimeType ?? 'video/mp4',
      sizeBytes,
      metadata: {
        ...renderResult.metadata,
        sourceMediaAssetIds: input.sourceMediaAssetIds ?? [],
      },
      errorMessage: renderResult.errorMessage ?? null,
    });

    return this.videoAssetRepository.create(asset);
  }
}
