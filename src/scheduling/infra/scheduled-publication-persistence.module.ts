import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { ScheduledPublicationRepository } from '../domain/scheduled-publication.repository.js';
import { PrismaScheduledPublicationRepository } from './repositories/prisma-scheduled-publication.repository.js';

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: ScheduledPublicationRepository,
      useClass: PrismaScheduledPublicationRepository,
    },
  ],
  exports: [ScheduledPublicationRepository],
})
export class ScheduledPublicationPersistenceModule {}
