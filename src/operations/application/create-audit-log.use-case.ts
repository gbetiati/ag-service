import { Injectable, NotFoundException } from '@nestjs/common';
import { CompanyRepository } from '../../companies/domain/company.repository.interface.js';
import { AuditLog } from '../domain/audit-log.entity.js';
import { AuditLogRepository } from '../domain/audit-log.repository.interface.js';

export type CreateAuditLogInput = {
  companyId: string;
  actorType: string;
  actorId?: string | null;
  resourceType: string;
  resourceId?: string | null;
  action: string;
  details?: Record<string, unknown> | null;
};

@Injectable()
export class CreateAuditLogUseCase {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: CreateAuditLogInput): Promise<AuditLog> {
    const company = await this.companyRepository.findById(input.companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const log = AuditLog.create({
      companyId: company.id,
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      action: input.action,
      details: input.details ?? null,
    });

    return this.auditLogRepository.create(log);
  }
}
