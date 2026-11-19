import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentValidationRepository } from '../domain/content-validation.repository.interface.js';
import { ContentValidation } from '../domain/content-validation.entity.js';
import { ValidateVideoUseCase } from './validate-video.use-case.js';

export type RevalidateVideoInput = {
  companyId: string;
  contentId: string;
  videoAssetId: string;
};

@Injectable()
export class RevalidateVideoUseCase {
  constructor(
    private readonly validationRepository: ContentValidationRepository,
    private readonly validateVideoUseCase: ValidateVideoUseCase,
  ) {}

  async execute(input: RevalidateVideoInput): Promise<ContentValidation> {
    const latest = await this.validationRepository.findLatestByContent(input.contentId);
    if (latest && latest.companyId !== input.companyId) {
      throw new NotFoundException('Validation record not found for this company');
    }

    return this.validateVideoUseCase.execute(input);
  }
}
