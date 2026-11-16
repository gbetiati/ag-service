import { describe, expect, it, vi } from 'vitest';
import { GetOperationDashboardUseCase } from './application/get-operation-dashboard.use-case.js';
import { NotificationRecord } from './domain/notification.entity.js';
import { ProcessingHistory } from './domain/processing-history.entity.js';

describe('operations module', () => {
  it('builds an operations dashboard for a company', async () => {
    const companyRepository = {
      findById: vi.fn().mockResolvedValue({ id: 'company-1' }),
    };

    const processingHistoryRepository = {
      findByCompany: vi.fn().mockResolvedValue([
        ProcessingHistory.create({ companyId: 'company-1', entityType: 'content', entityId: 'content-1', stage: 'validation', status: 'APPROVED' }),
        ProcessingHistory.create({ companyId: 'company-1', entityType: 'publication', entityId: 'publication-1', stage: 'publish', status: 'FAILED' }),
      ]),
    };

    const notificationRepository = {
      findByCompany: vi.fn().mockResolvedValue([
        NotificationRecord.create({ companyId: 'company-1', channel: 'email', title: 'Video ready', message: 'Validated', status: 'PENDING' }),
        NotificationRecord.create({ companyId: 'company-1', channel: 'email', title: 'Video rejected', message: 'Need revision', status: 'FAILED' }),
      ]),
    };

    const auditLogRepository = {
      findByCompany: vi.fn().mockResolvedValue([
        {
          id: 'audit-1',
          action: 'video_approved',
          actorType: 'system',
          resourceType: 'content',
          createdAt: new Date('2026-11-16T12:00:00.000Z'),
        },
      ]),
    };

    const useCase = new GetOperationDashboardUseCase(
      companyRepository as any,
      processingHistoryRepository as any,
      notificationRepository as any,
      auditLogRepository as any,
    );

    const result = await useCase.execute({ companyId: 'company-1' });

    expect(result.totalProcessingEvents).toBe(2);
    expect(result.pendingNotifications).toBe(1);
    expect(result.failedNotifications).toBe(1);
    expect(result.recentAuditActions[0].action).toBe('video_approved');
  });
});
