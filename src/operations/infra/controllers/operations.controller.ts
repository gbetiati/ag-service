import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateAuditLogUseCase } from '../../application/create-audit-log.use-case.js';
import { CreateNotificationUseCase } from '../../application/create-notification.use-case.js';
import { CreateProcessingHistoryUseCase } from '../../application/create-processing-history.use-case.js';
import { GetOperationDashboardUseCase } from '../../application/get-operation-dashboard.use-case.js';
import { MarkNotificationAsReadUseCase } from '../../application/mark-notification-as-read.use-case.js';
import { CreateAuditLogDto } from '../dto/create-audit-log.dto.js';
import { CreateNotificationDto } from '../dto/create-notification.dto.js';
import { CreateProcessingHistoryDto } from '../dto/create-processing-history.dto.js';
import { Roles } from '../../../identity/infra/http/identity.decorators.js';

@Controller('companies/:companyId/operations')
export class OperationsController {
  constructor(
    private readonly createProcessingHistoryUseCase: CreateProcessingHistoryUseCase,
    private readonly createNotificationUseCase: CreateNotificationUseCase,
    private readonly createAuditLogUseCase: CreateAuditLogUseCase,
    private readonly getOperationDashboardUseCase: GetOperationDashboardUseCase,
    private readonly markNotificationAsReadUseCase: MarkNotificationAsReadUseCase,
  ) {}

  @Post('processing-history')
  @Roles('OWNER', 'ADMIN')
  async createProcessingHistory(@Param('companyId') companyId: string, @Body() body: CreateProcessingHistoryDto) {
    return this.createProcessingHistoryUseCase.execute({ companyId, ...body });
  }

  @Post('notifications')
  @Roles('OWNER', 'ADMIN')
  async createNotification(@Param('companyId') companyId: string, @Body() body: CreateNotificationDto) {
    return this.createNotificationUseCase.execute({ companyId, ...body });
  }

  @Patch('notifications/:notificationId/read')
  async markNotificationAsRead(@Param('companyId') companyId: string, @Param('notificationId') notificationId: string) {
    return this.markNotificationAsReadUseCase.execute({ companyId, notificationId });
  }

  @Post('audit')
  @Roles('OWNER', 'ADMIN')
  async createAuditLog(@Param('companyId') companyId: string, @Body() body: CreateAuditLogDto) {
    return this.createAuditLogUseCase.execute({ companyId, ...body });
  }

  @Get('dashboard')
  async getDashboard(@Param('companyId') companyId: string) {
    return this.getOperationDashboardUseCase.execute({ companyId });
  }
}
