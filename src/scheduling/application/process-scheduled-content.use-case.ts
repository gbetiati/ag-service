import { Injectable, NotFoundException } from '@nestjs/common';
import { PublicationRepository } from '../../publication/domain/publication.repository.interface.js';

export type ProcessScheduledContentInput = {
  companyId: string;
  publicationId: string;
};

@Injectable()
export class ProcessScheduledContentUseCase {
  constructor(private readonly publicationRepository: PublicationRepository) {}

  async execute(input: ProcessScheduledContentInput): Promise<{ id: string; status: string; scheduledFor: Date | null }> {
    const publication = await this.publicationRepository.findById(input.publicationId);
    if (!publication || publication.companyId !== input.companyId) {
      throw new NotFoundException('Publication not found for this company.');
    }

    if (publication.status === 'PUBLISHED') {
      return { id: publication.id, status: publication.status, scheduledFor: publication.scheduledFor };
    }

    if (publication.scheduledFor && publication.scheduledFor.getTime() > Date.now()) {
      return { id: publication.id, status: publication.status, scheduledFor: publication.scheduledFor };
    }

    publication.status = 'QUEUED';
    publication.scheduledFor = null;
    const updated = await this.publicationRepository.update(publication);

    return {
      id: updated.id,
      status: updated.status,
      scheduledFor: updated.scheduledFor,
    };
  }
}
