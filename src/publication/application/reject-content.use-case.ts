import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentRepository } from '../../content/domain/content.repository.interface.js';

@Injectable()
export class RejectContentUseCase {
  constructor(private readonly contentRepository: ContentRepository) {}

  async execute(input: { companyId: string; contentId: string; reason?: string }): Promise<{ id: string; status: string; reason?: string | null }> {
    const content = await this.contentRepository.findById(input.contentId);
    if (!content || content.companyId !== input.companyId) {
      throw new NotFoundException('Content not found for this company.');
    }

    content.reject();
    const updated = await this.contentRepository.update(content);
    return { id: updated.id, status: updated.status, reason: input.reason ?? null };
  }
}
