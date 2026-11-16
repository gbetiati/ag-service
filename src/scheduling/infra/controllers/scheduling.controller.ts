import { Body, Controller, Param, Post } from '@nestjs/common';
import { PauseAutomationUseCase } from '../../application/pause-automation.use-case.js';
import { ProcessScheduledContentUseCase } from '../../application/process-scheduled-content.use-case.js';
import { ResumeAutomationUseCase } from '../../application/resume-automation.use-case.js';
import { SchedulePublicationUseCase } from '../../application/schedule-publication.use-case.js';
import { PauseAutomationDto } from '../dto/pause-automation.dto.js';
import { SchedulePublicationDto } from '../dto/schedule-publication.dto.js';
import { Roles } from '../../../identity/infra/http/identity.decorators.js';

@Controller('companies/:companyId/scheduling')
@Roles('OWNER', 'ADMIN')
export class SchedulingController {
  constructor(
    private readonly schedulePublicationUseCase: SchedulePublicationUseCase,
    private readonly processScheduledContentUseCase: ProcessScheduledContentUseCase,
    private readonly pauseAutomationUseCase: PauseAutomationUseCase,
    private readonly resumeAutomationUseCase: ResumeAutomationUseCase,
  ) {}

  @Post('publications/:publicationId/schedule')
  async schedulePublication(
    @Param('companyId') companyId: string,
    @Param('publicationId') publicationId: string,
    @Body() body: SchedulePublicationDto,
  ) {
    return this.schedulePublicationUseCase.execute({
      companyId,
      publicationId,
      scheduledFor: new Date(body.scheduledFor),
      queueName: body.queueName,
    });
  }

  @Post('publications/:publicationId/process')
  async processScheduledContent(@Param('companyId') companyId: string, @Param('publicationId') publicationId: string) {
    return this.processScheduledContentUseCase.execute({ companyId, publicationId });
  }

  @Post('queues/:queueName/pause')
  async pauseAutomation(@Param('companyId') companyId: string, @Param('queueName') queueName: string, @Body() body: PauseAutomationDto) {
    return this.pauseAutomationUseCase.execute({
      companyId,
      queueName: queueName as 'content-planning' | 'video-generation' | 'video-validation' | 'social-publishing' | 'notifications',
      reason: body.reason,
    });
  }

  @Post('queues/:queueName/resume')
  async resumeAutomation(@Param('companyId') companyId: string, @Param('queueName') queueName: string) {
    return this.resumeAutomationUseCase.execute({
      companyId,
      queueName: queueName as 'content-planning' | 'video-generation' | 'video-validation' | 'social-publishing' | 'notifications',
    });
  }
}
