import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CompaniesModule } from '../companies/companies.module.js';
import { AuditLogRepository } from './domain/audit-log.repository.interface.js';
import { NotificationRepository } from './domain/notification.repository.interface.js';
import { ProcessingHistoryRepository } from './domain/processing-history.repository.interface.js';
import { CreateAuditLogUseCase } from './application/create-audit-log.use-case.js';
import { CreateNotificationUseCase } from './application/create-notification.use-case.js';
import { CreateProcessingHistoryUseCase } from './application/create-processing-history.use-case.js';
import { GetOperationDashboardUseCase } from './application/get-operation-dashboard.use-case.js';
import { MarkNotificationAsReadUseCase } from './application/mark-notification-as-read.use-case.js';
import { OperationsController } from './infra/controllers/operations.controller.js';
import { PrismaAuditLogRepository } from './infra/repositories/prisma-audit-log.repository.js';
import { PrismaNotificationRepository } from './infra/repositories/prisma-notification.repository.js';
import { PrismaProcessingHistoryRepository } from './infra/repositories/prisma-processing-history.repository.js';

@Module({
  imports: [PrismaModule, CompaniesModule],
  controllers: [OperationsController],
  providers: [
    CreateProcessingHistoryUseCase,
    CreateNotificationUseCase,
    CreateAuditLogUseCase,
    GetOperationDashboardUseCase,
    MarkNotificationAsReadUseCase,
    {
      provide: ProcessingHistoryRepository,
      useClass: PrismaProcessingHistoryRepository,
    },
    {
      provide: NotificationRepository,
      useClass: PrismaNotificationRepository,
    },
    {
      provide: AuditLogRepository,
      useClass: PrismaAuditLogRepository,
    },
  ],
  exports: [ProcessingHistoryRepository, NotificationRepository, AuditLogRepository],
})
export class OperationsModule {}
