import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentHistory } from '../domain/content-history.entity.js';
import { ContentHistoryRepository } from '../domain/content-history.repository.interface.js';
import { ContentRepository } from '../domain/content.repository.interface.js';

export type GetContentHistoryInput = {
  companyId: string;
  contentId: string;
};

@Injectable()
export class GetContentHistoryUseCase {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly contentHistoryRepository: ContentHistoryRepository,
  ) {}

  async execute(input: GetContentHistoryInput): Promise<ContentHistory[]> {
    const content = await this.contentRepository.findById(input.contentId);
    if (!content || content.companyId !== input.companyId) {
      throw new NotFoundException('Content not found in company');
    }

    return this.contentHistoryRepository.findByContent(content.id);
  }
}
