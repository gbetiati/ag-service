import { Injectable, NotFoundException } from '@nestjs/common';
import { CompanyRepository } from '../../companies/domain/company.repository.interface.js';
import { ProcessingHistory } from '../domain/processing-history.entity.js';
import { ProcessingHistoryRepository } from '../domain/processing-history.repository.interface.js';

export type CreateProcessingHistoryInput = {
  companyId: string;
  entityType: string;
  entityId: string;
  stage: string;
  status: string;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
};

@Injectable()
export class CreateProcessingHistoryUseCase {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly processingHistoryRepository: ProcessingHistoryRepository,
  ) {}

  async execute(input: CreateProcessingHistoryInput): Promise<ProcessingHistory> {
    const company = await this.companyRepository.findById(input.companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const record = ProcessingHistory.create({
      companyId: company.id,
      entityType: input.entityType,
      entityId: input.entityId,
      stage: input.stage,
      status: input.status,
      message: input.message ?? null,
      metadata: input.metadata ?? null,
    });

    return this.processingHistoryRepository.create(record);
  }
}
