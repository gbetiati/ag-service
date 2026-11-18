import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PublicationModule } from '../publication/publication.module.js';
import { PauseAutomationUseCase } from './application/pause-automation.use-case.js';
import { ProcessScheduledContentUseCase } from './application/process-scheduled-content.use-case.js';
import { ResumeAutomationUseCase } from './application/resume-automation.use-case.js';
import { SchedulePublicationUseCase } from './application/schedule-publication.use-case.js';
import { AutomationStateRepository } from './domain/automation-state.repository.interface.js';
import { BullBoardModule } from './infra/bull-board/bull-board.module.js';
import { SchedulingController } from './infra/controllers/scheduling.controller.js';
import { PrismaAutomationStateRepository } from './infra/repositories/prisma-automation-state.repository.js';
import { SocialPublishingProcessor } from './infra/processors/social-publishing.processor.js';

@Module({
  imports: [PrismaModule, PublicationModule, BullBoardModule],
  controllers: [SchedulingController],
  providers: [
    SchedulePublicationUseCase,
    ProcessScheduledContentUseCase,
    PauseAutomationUseCase,
    ResumeAutomationUseCase,
    SocialPublishingProcessor,
    {
      provide: AutomationStateRepository,
      useClass: PrismaAutomationStateRepository,
    },
  ],
  exports: [AutomationStateRepository, BullBoardModule],
})
export class SchedulingModule {}
