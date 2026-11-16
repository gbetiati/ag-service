import { Injectable, NotFoundException } from '@nestjs/common';
import { CompanyRepository } from '../../companies/domain/company.repository.interface.js';
import { NotificationRecord } from '../domain/notification.entity.js';
import { NotificationRepository } from '../domain/notification.repository.interface.js';

export type CreateNotificationInput = {
  companyId: string;
  channel: string;
  title: string;
  message: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH';
  status?: 'PENDING' | 'SENT' | 'READ' | 'FAILED';
  metadata?: Record<string, unknown> | null;
};

@Injectable()
export class CreateNotificationUseCase {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(input: CreateNotificationInput): Promise<NotificationRecord> {
    const company = await this.companyRepository.findById(input.companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const notification = NotificationRecord.create({
      companyId: company.id,
      channel: input.channel,
      title: input.title,
      message: input.message,
      priority: input.priority ?? 'NORMAL',
      status: input.status ?? 'PENDING',
      metadata: input.metadata ?? null,
    });

    return this.notificationRepository.create(notification);
  }
}
