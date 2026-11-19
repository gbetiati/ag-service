import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { NotificationRecord } from '../../domain/notification.entity.js';
import { NotificationRepository } from '../../domain/notification.repository.interface.js';

@Injectable()
export class PrismaNotificationRepository extends NotificationRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(notification: NotificationRecord): Promise<NotificationRecord> {
    const created = await this.prisma.notification.create({
      data: {
        id: notification.id,
        companyId: notification.companyId,
        channel: notification.channel,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        status: notification.status,
        metadata: notification.metadata as any,
        readAt: notification.readAt,
      },
    });

    return new NotificationRecord(
      created.id,
      created.companyId,
      created.channel,
      created.title,
      created.message,
      created.priority,
      created.status,
      (created.metadata as Record<string, unknown>) ?? null,
      created.readAt,
      created.createdAt,
      created.updatedAt,
    );
  }

  async findByCompany(companyId: string): Promise<NotificationRecord[]> {
    const items = await this.prisma.notification.findMany({ where: { companyId }, orderBy: { createdAt: 'desc' } });
    return items.map((item) => new NotificationRecord(
      item.id,
      item.companyId,
      item.channel,
      item.title,
      item.message,
      item.priority,
      item.status,
      (item.metadata as Record<string, unknown>) ?? null,
      item.readAt,
      item.createdAt,
      item.updatedAt,
    ));
  }

  async markAsRead(id: string): Promise<NotificationRecord> {
    const updated = await this.prisma.notification.update({
      where: { id },
      data: {
        status: 'READ',
        readAt: new Date(),
      },
    });

    return new NotificationRecord(
      updated.id,
      updated.companyId,
      updated.channel,
      updated.title,
      updated.message,
      updated.priority,
      updated.status,
      (updated.metadata as Record<string, unknown>) ?? null,
      updated.readAt,
      updated.createdAt,
      updated.updatedAt,
    );
  }
}
