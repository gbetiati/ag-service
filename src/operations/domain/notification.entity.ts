export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH';
export type NotificationStatus = 'PENDING' | 'SENT' | 'READ' | 'FAILED';

export class NotificationRecord {
  constructor(
    public readonly id: string,
    public companyId: string,
    public channel: string,
    public title: string,
    public message: string,
    public priority: NotificationPriority,
    public status: NotificationStatus,
    public metadata: Record<string, unknown> | null,
    public readAt: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(input: {
    id?: string;
    companyId: string;
    channel: string;
    title: string;
    message: string;
    priority?: NotificationPriority;
    status?: NotificationStatus;
    metadata?: Record<string, unknown> | null;
    readAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }): NotificationRecord {
    return new NotificationRecord(
      input.id ?? crypto.randomUUID(),
      input.companyId,
      input.channel,
      input.title,
      input.message,
      input.priority ?? 'NORMAL',
      input.status ?? 'PENDING',
      input.metadata ?? null,
      input.readAt ?? null,
      input.createdAt ?? new Date(),
      input.updatedAt ?? new Date(),
    );
  }
}
