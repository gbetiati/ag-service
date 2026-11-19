import { Injectable, NotFoundException } from '@nestjs/common';
import { CompanyRepository } from '../../companies/domain/company.repository.interface.js';
import { AuditLogRepository } from '../domain/audit-log.repository.interface.js';
import { NotificationRepository } from '../domain/notification.repository.interface.js';
import { ProcessingHistoryRepository } from '../domain/processing-history.repository.interface.js';

export type GetOperationDashboardInput = {
  companyId: string;
};

@Injectable()
export class GetOperationDashboardUseCase {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly processingHistoryRepository: ProcessingHistoryRepository,
    private readonly notificationRepository: NotificationRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: GetOperationDashboardInput) {
    const company = await this.companyRepository.findById(input.companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const processingHistory = await this.processingHistoryRepository.findByCompany(company.id);
    const notifications = await this.notificationRepository.findByCompany(company.id);
    const auditLogs = await this.auditLogRepository.findByCompany(company.id);

    const byStatus = processingHistory.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] ?? 0) + 1;
      return acc;
    }, {});

    return {
      companyId: company.id,
      totalProcessingEvents: processingHistory.length,
      totalNotifications: notifications.length,
      totalAuditLogs: auditLogs.length,
      processingStatusCounts: byStatus,
      pendingNotifications: notifications.filter((item) => item.status === 'PENDING').length,
      failedNotifications: notifications.filter((item) => item.status === 'FAILED').length,
      recentAuditActions: auditLogs.slice(-10).map((item) => ({
        action: item.action,
        actorType: item.actorType,
        resourceType: item.resourceType,
        createdAt: item.createdAt,
      })),
      latestProcessing: processingHistory.slice(-5).map((item) => ({
        entityType: item.entityType,
        entityId: item.entityId,
        stage: item.stage,
        status: item.status,
        createdAt: item.createdAt,
      })),
    };
  }
}
