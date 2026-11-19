import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { ContentHistory } from '../../domain/content-history.entity.js';
import { ContentHistoryRepository } from '../../domain/content-history.repository.interface.js';

@Injectable()
export class PrismaContentHistoryRepository implements ContentHistoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(history: ContentHistory): Promise<ContentHistory> {
    const created = await this.prisma.contentHistory.create({
      data: {
        id: history.id,
        contentId: history.contentId,
        action: history.action,
        previousData: history.previousData as Prisma.InputJsonValue | undefined,
        newData: history.newData as Prisma.InputJsonValue | undefined,
      },
    });

    return this.toEntity(created);
  }

  async findByContent(contentId: string): Promise<ContentHistory[]> {
    const records = await this.prisma.contentHistory.findMany({
      where: { contentId },
      orderBy: { createdAt: 'desc' },
    });

    return records.map(record => this.toEntity(record));
  }

  private toEntity(record: {
    id: string;
    contentId: string;
    action: string;
    previousData: Prisma.JsonValue | null;
    newData: Prisma.JsonValue | null;
    createdAt: Date;
  }): ContentHistory {
    return new ContentHistory(
      record.id,
      record.contentId,
      record.action,
      (record.previousData ?? null) as Record<string, unknown> | null,
      (record.newData ?? null) as Record<string, unknown> | null,
      record.createdAt,
    );
  }
}
