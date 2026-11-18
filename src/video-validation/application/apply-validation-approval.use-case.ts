import { Injectable, NotFoundException } from '@nestjs/common';
import { CompanyRepository } from '../../companies/domain/company.repository.interface.js';
import { ContentRepository } from '../../content/domain/content.repository.interface.js';

@Injectable()
export class ApplyValidationApprovalUseCase {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly contentRepository: ContentRepository,
  ) {}

  async execute(input: { companyId: string; contentId: string; validationStatus: string }): Promise<void> {
    if (input.validationStatus !== 'APPROVED') {
      return;
    }

    const [company, content] = await Promise.all([
      this.companyRepository.findById(input.companyId),
      this.contentRepository.findById(input.contentId),
    ]);
    if (!company || !content || content.companyId !== input.companyId) {
      throw new NotFoundException('Company or content not found for validation approval.');
    }

    if (company.approvalMode === 'AUTOMATIC' && content.status !== 'PUBLISHED') {
      content.approve();
      await this.contentRepository.update(content);
    }
  }
}
