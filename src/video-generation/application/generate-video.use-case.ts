import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { VideoGeneration } from '../domain/video-generation.entity.js';
import { VideoGenerationRepository } from '../domain/video-generation.repository.interface.js';
import { VideoGenerationQueue } from '../domain/video-generation-queue.interface.js';
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
    private readonly videoGenerationRepository: VideoGenerationRepository,
    private readonly videoGenerationQueue: VideoGenerationQueue,
  ) {}

  async execute(input: GenerateVideoInput): Promise<VideoGeneration> {
    const content = await this.contentRepository.findById(input.contentId);
    if (!content || content.companyId !== input.companyId) {
      throw new NotFoundException('Content not found in company');
    }
    if (content.status === 'PUBLISHED') {
      throw new ConflictException('Published content cannot be sent through video generation again.');
    }
    if (content.status === 'APPROVED') {
      content.status = 'DRAFT';
      await this.contentRepository.update(content);
    }
    //etapa 1
    const generation = VideoGeneration.create({
      companyId: input.companyId,
      contentId: content.id,
      provider: input.provider ?? 'CREATOMATE',
      request: {
        sourceMediaAssetIds: input.sourceMediaAssetIds ?? [],
        outputFormat: input.outputFormat ?? 'mp4',
      },
    });

    const createdGeneration = await this.videoGenerationRepository.create(generation);

    try {
      await this.videoGenerationQueue.enqueue({
        companyId: input.companyId,
        videoGenerationId: createdGeneration.id,
      });
    } catch (error) {
      createdGeneration.status = 'FAILED';
      createdGeneration.errorMessage = error instanceof Error ? error.message : 'Unable to enqueue video generation';
      await this.videoGenerationRepository.update(createdGeneration);
      throw error;
    }

    return createdGeneration;
  }
}
