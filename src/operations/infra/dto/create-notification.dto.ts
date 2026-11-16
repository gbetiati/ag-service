export class CreateNotificationDto {
  channel: string;
  title: string;
  message: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH';
  status?: 'PENDING' | 'SENT' | 'READ' | 'FAILED';
  metadata?: Record<string, unknown> | null;
}
