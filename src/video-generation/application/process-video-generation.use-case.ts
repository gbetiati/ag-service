import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContentRepository } from '../../content/domain/content.repository.interface.js';
import { MediaAssetRepository } from '../../media/domain/media-asset.repository.interface.js';
import { MediaAssetUrlProvider } from '../../media/domain/media-asset-url-provider.interface.js';
import { StorageProvider } from '../../storage/domain/storage-provider.interface.js';
import { VideoAsset } from '../domain/video-asset.entity.js';
import { VideoAssetRepository } from '../domain/video-asset.repository.interface.js';
import { VideoGeneration } from '../domain/video-generation.entity.js';
import { VideoGenerationRepository } from '../domain/video-generation.repository.interface.js';
import {
  VideoGenerationResult,
  VideoProvider,
} from '../domain/video-provider.interface.js';

@Injectable()
export class ProcessVideoGenerationUseCase {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly videoGenerationRepository: VideoGenerationRepository,
    private readonly videoAssetRepository: VideoAssetRepository,
    private readonly mediaAssetRepository: MediaAssetRepository,
    private readonly mediaAssetUrlProvider: MediaAssetUrlProvider,
    private readonly videoProvider: VideoProvider,
    private readonly storageProvider: StorageProvider,
  ) {}

  async execute(input: {
    companyId: string;
    videoGenerationId: string;
  }): Promise<VideoGeneration> {
    const generation = await this.videoGenerationRepository.findById(
      input.videoGenerationId,
    );
    if (!generation || generation.companyId !== input.companyId) {
      throw new NotFoundException('Video generation not found in company');
    }
    if (generation.status === 'READY' && generation.videoAssetId) {
      return generation;
    }
    const persistedAsset = await this.videoAssetRepository.findById(
      generation.id,
    );
    if (persistedAsset?.status === 'READY' && persistedAsset.storageKey) {
      generation.videoAssetId = persistedAsset.id;
      generation.status = 'READY';
      generation.errorMessage = null;
      return this.videoGenerationRepository.update(generation);
    }

    const content = await this.contentRepository.findById(generation.contentId);
    if (!content || content.companyId !== input.companyId) {
      throw new NotFoundException('Content not found in company');
    }

    generation.status = 'RENDERING';
    generation.errorMessage = null;
    await this.videoGenerationRepository.update(generation);

    let sourceMediaAssets: Awaited<
      ReturnType<ProcessVideoGenerationUseCase['getSourceMediaAssets']>
    > = [];
    if (!generation.renderJobId) {
      sourceMediaAssets = await this.getSourceMediaAssets(
        generation,
        content.productId,
        input.companyId,
      );
      generation.request.sourceMediaAssetIds = sourceMediaAssets.map(
        (asset) => asset.id,
      );
      await this.videoGenerationRepository.update(generation);
    }

    let renderResult: VideoGenerationResult;
    if (generation.renderJobId) {
      renderResult = await this.videoProvider.getRenderStatus(
        generation.renderJobId,
      );
    } else {
      renderResult = await this.videoProvider.createRenderJob({
        companyId: input.companyId,
        contentId: content.id,
        title: content.title,
        script: content.script,
        brandId: content.brandId,
        productId: content.productId,
        sourceMediaAssetIds: this.getSourceMediaAssetIds(generation.request),
        sourceMediaUrls: sourceMediaAssets.map((asset) =>
          this.mediaAssetUrlProvider.createUrl(asset),
        ),
        outputFormat: this.getOutputFormat(generation.request),
      });
    }

    generation.renderJobId = renderResult.renderJobId;
    await this.videoGenerationRepository.update(generation);
    if (renderResult.status === 'FAILED') {
      generation.status = 'FAILED';
      generation.errorMessage =
        renderResult.errorMessage ??
        'Video provider failed to render the video';
      await this.videoGenerationRepository.update(generation);
      throw new Error(generation.errorMessage);
    }

    if (renderResult.status !== 'READY') {
      generation.status = 'RENDERING';
      await this.videoGenerationRepository.update(generation);
      return generation;
    }

    const finalVideoStream = await this.videoProvider.fetchFinalVideo(
      renderResult.renderJobId,
    );
    const outputFormat = this.getOutputFormat(generation.request);
    const mimeType =
      outputFormat === 'mp4' ? 'video/mp4' : `video/${outputFormat}`;
    const upload = await this.storageProvider.upload({
      stream: finalVideoStream,
      originalName: `${content.slug}.${outputFormat}`,
      mimeType,
      directory: 'videos',
    });
    if (upload.sizeBytes === 0) {
      await this.storageProvider.delete(upload.key);
      throw new Error('Creatomate returned an empty video file.');
    }

    const asset = await this.videoAssetRepository.create(
      VideoAsset.create({
        id: generation.id,
        companyId: generation.companyId,
        contentId: generation.contentId,
        provider: generation.provider,
        status: 'READY',
        renderJobId: generation.renderJobId,
        storageKey: upload.key,
        mimeType: upload.mimeType,
        sizeBytes: upload.sizeBytes,
        metadata: {
          ...renderResult.metadata,
          sourceMediaAssetIds: this.getSourceMediaAssetIds(generation.request),
          outputFormat,
          storageUrl: upload.url,
        },
      }),
    );

    generation.videoAssetId = asset.id;
    generation.status = 'READY';
    generation.errorMessage = null;
    return this.videoGenerationRepository.update(generation);
  }

  private getSourceMediaAssetIds(request: Record<string, unknown>): string[] {
    const ids = request.sourceMediaAssetIds;
    return Array.isArray(ids) && ids.every((id) => typeof id === 'string')
      ? ids
      : [];
  }

  private async getSourceMediaAssets(
    generation: VideoGeneration,
    productId: string | null,
    companyId: string,
  ) {
    const requestedIds = this.getSourceMediaAssetIds(generation.request);
    const assets =
      requestedIds.length > 0
        ? await Promise.all(
            requestedIds.map((id) => this.mediaAssetRepository.findById(id)),
          )
        : productId
          ? await this.mediaAssetRepository.findByProduct(companyId, productId)
          : [];
    const validAssets = assets.filter((asset) => asset !== null);

    if (
      validAssets.length === 0 ||
      validAssets.length !== assets.length ||
      validAssets.some(
        (asset) =>
          asset.companyId !== companyId ||
          asset.kind !== 'IMAGE' ||
          !asset.mimeType.startsWith('image/'),
      )
    ) {
      throw new BadRequestException(
        'Video generation requires image assets belonging to this company.',
      );
    }

    return validAssets;
  }

  private getOutputFormat(request: Record<string, unknown>): string {
    return typeof request.outputFormat === 'string'
      ? request.outputFormat
      : 'mp4';
  }
}
