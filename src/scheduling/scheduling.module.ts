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

import { ContentStrategyModule } from '../content-strategy/content-strategy.module.js';
import { ScheduledPublicationPersistenceModule } from './infra/scheduled-publication-persistence.module.js';
import { ScheduledPublicationQueue } from './application/scheduled-publication-queue.service.js';
import { RunScheduledPublicationUseCase } from './application/run-scheduled-publication.use-case.js';
import { ScheduledPublicationProcessor } from './infra/processors/scheduled-publication.processor.js';

@Module({
  imports: [PrismaModule, PublicationModule, BullBoardModule, ContentStrategyModule, ScheduledPublicationPersistenceModule],
  controllers: [SchedulingController],
  providers: [
    SchedulePublicationUseCase,
    ProcessScheduledContentUseCase,
    PauseAutomationUseCase,
    ResumeAutomationUseCase,
    SocialPublishingProcessor,
    ScheduledPublicationQueue,
    RunScheduledPublicationUseCase,
    ScheduledPublicationProcessor,
    {
      provide: AutomationStateRepository,
      useClass: PrismaAutomationStateRepository,
    },
  ],
  exports: [AutomationStateRepository, BullBoardModule],
})
export class SchedulingModule {}
