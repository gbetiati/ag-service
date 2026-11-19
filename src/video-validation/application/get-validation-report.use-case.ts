import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentValidationRepository } from '../domain/content-validation.repository.interface.js';
import { ContentValidation, ValidationResult } from '../domain/content-validation.entity.js';

export type GetValidationReportInput = {
  companyId: string;
  contentId: string;
};

export type GetValidationReportResult = {
  validation: ContentValidation;
  results: ValidationResult[];
};

@Injectable()
export class GetValidationReportUseCase {
  constructor(private readonly validationRepository: ContentValidationRepository) {}

  async execute(input: GetValidationReportInput): Promise<GetValidationReportResult> {
    const validation = await this.validationRepository.findLatestByContent(input.contentId);
    if (!validation || validation.companyId !== input.companyId) {
      throw new NotFoundException('Validation report not found');
    }

    const results = await this.validationRepository.findResults(validation.id);
    return { validation, results };
  }
}
