import { NotificationRecord } from './notification.entity.js';

export abstract class NotificationRepository {
  abstract create(notification: NotificationRecord): Promise<NotificationRecord>;
  abstract findByCompany(companyId: string): Promise<NotificationRecord[]>;
  abstract markAsRead(id: string): Promise<NotificationRecord>;
}
