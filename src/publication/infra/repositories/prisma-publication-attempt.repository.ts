import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { PublicationAttempt } from '../../domain/publication-attempt.entity.js';
import { PublicationAttemptRepository } from '../../domain/publication-attempt.repository.interface.js';

@Injectable()
export class PrismaPublicationAttemptRepository extends PublicationAttemptRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(attempt: PublicationAttempt): Promise<PublicationAttempt> {
    const record = await this.prisma.publicationAttempt.create({
      data: {
        id: attempt.id,
        publicationId: attempt.publicationId,
        attemptNumber: attempt.attemptNumber,
        status: attempt.status,
        providerResponse: (attempt.providerResponse ?? undefined) as Prisma.InputJsonValue | undefined,
        errorMessage: attempt.errorMessage,
        createdAt: attempt.createdAt,
      },
    });

    return this.toEntity(record);
  }

  async findByPublication(publicationId: string): Promise<PublicationAttempt[]> {
    const records = await this.prisma.publicationAttempt.findMany({
      where: { publicationId },
      orderBy: { attemptNumber: 'asc' },
    });

    return records.map((record) => this.toEntity(record));
  }

  private toEntity(record: {
    id: string;
    publicationId: string;
    attemptNumber: number;
    status: string;
    providerResponse: Prisma.JsonValue | null;
    errorMessage: string | null;
    createdAt: Date;
  }): PublicationAttempt {
    return new PublicationAttempt(
      record.id,
      record.publicationId,
      record.attemptNumber,
      record.status as any,
      record.providerResponse && typeof record.providerResponse === 'object' && !Array.isArray(record.providerResponse)
        ? (record.providerResponse as Record<string, unknown>)
        : record.providerResponse !== null
          ? ({ value: record.providerResponse } as Record<string, unknown>)
          : null,
      record.errorMessage,
      record.createdAt,
    );
  }
}
