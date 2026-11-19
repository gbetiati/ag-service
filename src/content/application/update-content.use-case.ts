import { Injectable, NotFoundException } from '@nestjs/common';
import { Content } from '../domain/content.entity.js';
import { ContentHistory } from '../domain/content-history.entity.js';
import { ContentHistoryRepository } from '../domain/content-history.repository.interface.js';
import { ContentRepository } from '../domain/content.repository.interface.js';

export type UpdateContentInput = {
  companyId: string;
  contentId: string;
  title?: string;
  slug?: string;
  status?: Content['status'];
  script?: string | null;
  brief?: string | null;
  editorialMetadata?: Record<string, unknown> | null;
};

@Injectable()
export class UpdateContentUseCase {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly contentHistoryRepository: ContentHistoryRepository,
  ) {}

  async execute(input: UpdateContentInput): Promise<Content> {
    const current = await this.contentRepository.findById(input.contentId);
    if (!current || current.companyId !== input.companyId) {
      throw new NotFoundException('Content not found in company');
    }

    const updated = new Content(
      current.id,
      current.companyId,
      current.brandId,
      current.productId,
      input.title ?? current.title,
      input.slug ?? current.slug,
      input.status ?? current.status,
      input.script ?? current.script,
      input.brief ?? current.brief,
      input.editorialMetadata ?? current.editorialMetadata,
      current.embedding,
      current.createdAt,
      new Date(),
    );

    const saved = await this.contentRepository.update(updated);

    await this.contentHistoryRepository.create(
      new ContentHistory(
        crypto.randomUUID(),
        saved.id,
        'updated',
        {
          title: current.title,
          slug: current.slug,
          status: current.status,
        },
        {
          title: saved.title,
          slug: saved.slug,
          status: saved.status,
        },
        new Date(),
      ),
    );

    return saved;
  }
}
