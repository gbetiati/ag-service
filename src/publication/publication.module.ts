import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ContentModule } from '../content/content.module.js';
import { MediaModule } from '../media/media.module.js';
import { VideoValidationModule } from '../video-validation/video-validation.module.js';
import { VideoGenerationModule } from '../video-generation/video-generation.module.js';
import { CreateSocialAccountUseCase } from './application/create-social-account.use-case.js';
import { CreateSocialCredentialUseCase } from './application/create-social-credential.use-case.js';
import { GetSocialAccountsUseCase } from './application/get-social-accounts.use-case.js';
import { CreatePublicationUseCase } from './application/create-publication.use-case.js';
import { ApproveContentUseCase } from './application/approve-content.use-case.js';
import { RejectContentUseCase } from './application/reject-content.use-case.js';
import { PublishContentUseCase } from './application/publish-content.use-case.js';
import { QueueImmediatePublicationUseCase } from './application/queue-immediate-publication.use-case.js';
import { StartInstagramOAuthUseCase } from './application/start-instagram-oauth.use-case.js';
import { CompleteInstagramOAuthUseCase } from './application/complete-instagram-oauth.use-case.js';
import { SocialAccountRepository } from './domain/social-account.repository.interface.js';
import { SocialCredentialRepository } from './domain/social-credential.repository.interface.js';
import { PublicationRepository } from './domain/publication.repository.interface.js';
import { PublicationAttemptRepository } from './domain/publication-attempt.repository.interface.js';
import { PublicationGateService } from './domain/publication-gate.service.interface.js';
import { SocialPublisher } from './domain/social-publisher.interface.js';
import { MetaInstagramOAuthProvider } from './domain/meta-instagram-oauth.provider.interface.js';
import { PublicationController } from './infra/controllers/publication.controller.js';
import { InstagramOAuthController } from './infra/controllers/instagram-oauth.controller.js';
import { PrismaSocialAccountRepository } from './infra/repositories/prisma-social-account.repository.js';
import { PrismaSocialCredentialRepository } from './infra/repositories/prisma-social-credential.repository.js';
import { PrismaPublicationRepository } from './infra/repositories/prisma-publication.repository.js';
import { PrismaPublicationAttemptRepository } from './infra/repositories/prisma-publication-attempt.repository.js';
import { CredentialEncryptionService } from './infra/services/credential-encryption.service.js';
import { InstagramOAuthStateService } from './infra/services/instagram-oauth-state.service.js';
import { PublicationGateServiceImpl } from './infra/services/publication-gate.service.js';
import { InstagramPublisher } from './infra/providers/instagram-publisher.service.js';
import { MetaGraphInstagramOAuthProvider } from './infra/providers/meta-graph-instagram-oauth.provider.js';
import { SchedulingQueueService } from '../scheduling/domain/queue.service.interface.js';
import { BullMqQueueService } from '../scheduling/infra/services/bullmq-queue.service.js';

import { ScheduledPublicationPersistenceModule } from '../scheduling/infra/scheduled-publication-persistence.module.js';

@Module({
  imports: [PrismaModule, ContentModule, MediaModule, VideoValidationModule, VideoGenerationModule, ScheduledPublicationPersistenceModule],
  controllers: [PublicationController, InstagramOAuthController],
  providers: [
    CreateSocialAccountUseCase,
    GetSocialAccountsUseCase,
    CreateSocialCredentialUseCase,
    CreatePublicationUseCase,
    ApproveContentUseCase,
    RejectContentUseCase,
    PublishContentUseCase,
    QueueImmediatePublicationUseCase,
    StartInstagramOAuthUseCase,
    CompleteInstagramOAuthUseCase,
    InstagramOAuthStateService,
    {
      provide: SchedulingQueueService,
      useClass: BullMqQueueService,
    },
    CredentialEncryptionService,
    {
      provide: SocialAccountRepository,
      useClass: PrismaSocialAccountRepository,
    },
    {
      provide: SocialCredentialRepository,
      useClass: PrismaSocialCredentialRepository,
    },
    {
      provide: PublicationRepository,
      useClass: PrismaPublicationRepository,
    },
    {
      provide: PublicationAttemptRepository,
      useClass: PrismaPublicationAttemptRepository,
    },
    {
      provide: PublicationGateService,
      useClass: PublicationGateServiceImpl,
    },
    {
      provide: SocialPublisher,
      useClass: InstagramPublisher,
    },
    {
      provide: MetaInstagramOAuthProvider,
      useClass: MetaGraphInstagramOAuthProvider,
    },
  ],
  exports: [
    SocialAccountRepository,
    SocialCredentialRepository,
    PublicationRepository,
    PublicationAttemptRepository,
    PublicationGateService,
    PublishContentUseCase,
    SchedulingQueueService,
  ],
})
export class PublicationModule {}
