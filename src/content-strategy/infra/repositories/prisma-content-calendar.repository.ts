import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { ContentCalendarEntry } from '../../domain/content-calendar.entity.js';
import { ContentCalendarRepository } from '../../domain/content-calendar.repository.interface.js';

@Injectable()
export class PrismaContentCalendarRepository extends ContentCalendarRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(entry: ContentCalendarEntry): Promise<ContentCalendarEntry> {
    const created = await this.prisma.contentCalendar.create({
      data: {
        id: entry.id,
        companyId: entry.companyId,
        planId: entry.planId,
        contentId: entry.contentId,
        scheduledFor: entry.scheduledFor,
        channel: entry.channel,
        status: entry.status,
        notes: entry.notes,
      },
    });

    return ContentCalendarEntry.fromPersistence({
      id: created.id,
      companyId: created.companyId,
      planId: created.planId,
      contentId: created.contentId,
      scheduledFor: created.scheduledFor,
      channel: created.channel,
      status: created.status,
      notes: created.notes,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    });
  }

  async findByCompany(companyId: string): Promise<ContentCalendarEntry[]> {
    const items = await this.prisma.contentCalendar.findMany({ where: { companyId } });
    return items.map((item) => ContentCalendarEntry.fromPersistence({
      id: item.id,
      companyId: item.companyId,
      planId: item.planId,
      contentId: item.contentId,
      scheduledFor: item.scheduledFor,
      channel: item.channel,
      status: item.status,
      notes: item.notes,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  }

  async findByPlan(planId: string): Promise<ContentCalendarEntry[]> {
    const items = await this.prisma.contentCalendar.findMany({ where: { planId } });
    return items.map((item) => ContentCalendarEntry.fromPersistence({
      id: item.id,
      companyId: item.companyId,
      planId: item.planId,
      contentId: item.contentId,
      scheduledFor: item.scheduledFor,
      channel: item.channel,
      status: item.status,
      notes: item.notes,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  }
}
