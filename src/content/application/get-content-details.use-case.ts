import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentSceneRepository } from '../domain/content-scene.repository.interface.js';
import { ContentAssetRepository } from '../domain/content-asset.repository.interface.js';
import { ContentHistoryRepository } from '../domain/content-history.repository.interface.js';
import { ContentRepository } from '../domain/content.repository.interface.js';
import { Content } from '../domain/content.entity.js';
import { ContentScene } from '../domain/content-scene.entity.js';
import { ContentAsset } from '../domain/content-asset.entity.js';
import { ContentHistory } from '../domain/content-history.entity.js';

export type GetContentDetailsInput = {
  companyId: string;
  contentId: string;
};

export type GetContentDetailsResult = {
  content: Content;
  scenes: ContentScene[];
  assets: ContentAsset[];
  history: ContentHistory[];
};

@Injectable()
export class GetContentDetailsUseCase {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly contentSceneRepository: ContentSceneRepository,
    private readonly contentAssetRepository: ContentAssetRepository,
    private readonly contentHistoryRepository: ContentHistoryRepository,
  ) {}

  async execute(input: GetContentDetailsInput): Promise<GetContentDetailsResult> {
    const content = await this.contentRepository.findById(input.contentId);
    if (!content || content.companyId !== input.companyId) {
      throw new NotFoundException('Content not found in company');
    }

    const [scenes, assets, history] = await Promise.all([
      this.contentSceneRepository.findByContent(content.id),
      this.contentAssetRepository.findByContent(content.id),
      this.contentHistoryRepository.findByContent(content.id),
    ]);

    return { content, scenes, assets, history };
  }
}
