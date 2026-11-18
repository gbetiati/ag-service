import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PublicationModule } from '../publication/publication.module.js';
import { PauseAutomationUseCase } from './application/pause-automation.use-case.js';
import { ProcessScheduledContentUseCase } from './application/process-scheduled-content.use-case.js';
import { ResumeAutomationUseCase } from './application/resume-automation.use-case.js';
import { SchedulePublicationUseCase } from './application/schedule-publication.use-case.js';
import { AutomationStateRepository } from './domain/automation-state.repository.interface.js';
import { SchedulingQueueService } from './domain/queue.service.interface.js';
import { SchedulingController } from './infra/controllers/scheduling.controller.js';
import { PrismaAutomationStateRepository } from './infra/repositories/prisma-automation-state.repository.js';
import { BullMqQueueService } from './infra/services/bullmq-queue.service.js';

@Module({
  imports: [PrismaModule, PublicationModule],
  controllers: [SchedulingController],
  providers: [
    SchedulePublicationUseCase,
    ProcessScheduledContentUseCase,
    PauseAutomationUseCase,
    ResumeAutomationUseCase,
    {
      provide: AutomationStateRepository,
      useClass: PrismaAutomationStateRepository,
    },
    {
      provide: SchedulingQueueService,
      useClass: BullMqQueueService,
    },
  ],
  exports: [AutomationStateRepository, SchedulingQueueService],
})
export class SchedulingModule {}
