import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ContentModule } from '../content/content.module.js';
import { VideoValidationModule } from '../video-validation/video-validation.module.js';
import { CreateSocialAccountUseCase } from './application/create-social-account.use-case.js';
import { CreateSocialCredentialUseCase } from './application/create-social-credential.use-case.js';
import { GetSocialAccountsUseCase } from './application/get-social-accounts.use-case.js';
import { CreatePublicationUseCase } from './application/create-publication.use-case.js';
import { ApproveContentUseCase } from './application/approve-content.use-case.js';
import { RejectContentUseCase } from './application/reject-content.use-case.js';
import { PublishContentUseCase } from './application/publish-content.use-case.js';
import { SocialAccountRepository } from './domain/social-account.repository.interface.js';
import { SocialCredentialRepository } from './domain/social-credential.repository.interface.js';
import { PublicationRepository } from './domain/publication.repository.interface.js';
import { PublicationAttemptRepository } from './domain/publication-attempt.repository.interface.js';
import { PublicationGateService } from './domain/publication-gate.service.interface.js';
import { SocialPublisher } from './domain/social-publisher.interface.js';
import { PublicationController } from './infra/controllers/publication.controller.js';
import { PrismaSocialAccountRepository } from './infra/repositories/prisma-social-account.repository.js';
import { PrismaSocialCredentialRepository } from './infra/repositories/prisma-social-credential.repository.js';
import { PrismaPublicationRepository } from './infra/repositories/prisma-publication.repository.js';
import { PrismaPublicationAttemptRepository } from './infra/repositories/prisma-publication-attempt.repository.js';
import { CredentialEncryptionService } from './infra/services/credential-encryption.service.js';
import { PublicationGateServiceImpl } from './infra/services/publication-gate.service.js';
import { InstagramPublisher } from './infra/providers/instagram-publisher.service.js';

@Module({
  imports: [PrismaModule, ContentModule, VideoValidationModule],
  controllers: [PublicationController],
  providers: [
    CreateSocialAccountUseCase,
    GetSocialAccountsUseCase,
    CreateSocialCredentialUseCase,
    CreatePublicationUseCase,
    ApproveContentUseCase,
    RejectContentUseCase,
    PublishContentUseCase,
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
  ],
  exports: [SocialAccountRepository, SocialCredentialRepository, PublicationRepository],
})
export class PublicationModule {}
