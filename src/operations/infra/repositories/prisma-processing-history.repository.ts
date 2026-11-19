import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { ProcessingHistory } from '../../domain/processing-history.entity.js';
import { ProcessingHistoryRepository } from '../../domain/processing-history.repository.interface.js';

@Injectable()
export class PrismaProcessingHistoryRepository extends ProcessingHistoryRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(processingHistory: ProcessingHistory): Promise<ProcessingHistory> {
    const created = await this.prisma.processingHistory.create({
      data: {
        id: processingHistory.id,
        companyId: processingHistory.companyId,
        entityType: processingHistory.entityType,
        entityId: processingHistory.entityId,
        stage: processingHistory.stage,
        status: processingHistory.status,
        message: processingHistory.message,
        metadata: processingHistory.metadata as any,
      },
    });

    return new ProcessingHistory(
      created.id,
      created.companyId,
      created.entityType,
      created.entityId,
      created.stage,
      created.status,
      created.message,
      (created.metadata as Record<string, unknown>) ?? null,
      created.createdAt,
    );
  }

  async findByCompany(companyId: string): Promise<ProcessingHistory[]> {
    const items = await this.prisma.processingHistory.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' } });
    return items.map((item) => new ProcessingHistory(
      item.id,
      item.companyId,
      item.entityType,
      item.entityId,
      item.stage,
      item.status,
      item.message,
      (item.metadata as Record<string, unknown>) ?? null,
      item.createdAt,
    ));
  }

  async findByEntity(companyId: string, entityType: string, entityId: string): Promise<ProcessingHistory[]> {
    const items = await this.prisma.processingHistory.findMany({
      where: { companyId, entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((item) => new ProcessingHistory(
      item.id,
      item.companyId,
      item.entityType,
      item.entityId,
      item.stage,
      item.status,
      item.message,
      (item.metadata as Record<string, unknown>) ?? null,
      item.createdAt,
    ));
  }
}
