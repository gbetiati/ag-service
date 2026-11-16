import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationRepository } from '../domain/notification.repository.interface.js';

export type MarkNotificationAsReadInput = {
  companyId: string;
  notificationId: string;
};

@Injectable()
export class MarkNotificationAsReadUseCase {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(input: MarkNotificationAsReadInput) {
    const notifications = await this.notificationRepository.findByCompany(input.companyId);
    const notification = notifications.find((item) => item.id === input.notificationId);
    if (!notification) {
      throw new NotFoundException('Notification not found for this company');
    }

    return this.notificationRepository.markAsRead(notification.id);
  }
}
