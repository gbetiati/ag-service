import { Injectable, NotFoundException } from '@nestjs/common';
import { CompanyRepository } from '../domain/company.repository.interface.js';

@Injectable()
export class UpdateCompanyApprovalModeUseCase {
  constructor(private readonly companyRepository: CompanyRepository) {}

  async execute(input: { companyId: string; approvalMode: 'MANUAL' | 'AUTOMATIC' }) {
    const company = await this.companyRepository.findById(input.companyId);
    if (!company) {
      throw new NotFoundException('Company not found.');
    }

    company.approvalMode = input.approvalMode;
    const updated = await this.companyRepository.update(company);
    return { companyId: updated.id, approvalMode: updated.approvalMode };
  }
}
