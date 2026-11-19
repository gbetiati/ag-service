import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { AuditLog } from '../../domain/audit-log.entity.js';
import { AuditLogRepository } from '../../domain/audit-log.repository.interface.js';

@Injectable()
export class PrismaAuditLogRepository extends AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(log: AuditLog): Promise<AuditLog> {
    const created = await this.prisma.auditLog.create({
      data: {
        id: log.id,
        companyId: log.companyId,
        actorType: log.actorType,
        actorId: log.actorId,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        action: log.action,
        details: log.details as any,
      },
    });

    return new AuditLog(
      created.id,
      created.companyId,
      created.actorType,
      created.actorId,
      created.resourceType,
      created.resourceId,
      created.action,
      (created.details as Record<string, unknown>) ?? null,
      created.createdAt,
    );
  }

  async findByCompany(companyId: string): Promise<AuditLog[]> {
    const items = await this.prisma.auditLog.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' } });
    return items.map((item) => new AuditLog(
      item.id,
      item.companyId,
      item.actorType,
      item.actorId,
      item.resourceType,
      item.resourceId,
      item.action,
      (item.details as Record<string, unknown>) ?? null,
      item.createdAt,
    ));
  }

  async findByResource(resourceType: string, resourceId: string): Promise<AuditLog[]> {
    const items = await this.prisma.auditLog.findMany({
      where: { resourceType, resourceId },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((item) => new AuditLog(
      item.id,
      item.companyId,
      item.actorType,
      item.actorId,
      item.resourceType,
      item.resourceId,
      item.action,
      (item.details as Record<string, unknown>) ?? null,
      item.createdAt,
    ));
  }
}
