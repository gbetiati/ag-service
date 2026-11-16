export type ContentCalendarStatus = 'PLANNED' | 'PUBLISHED' | 'SKIPPED' | 'CANCELLED';

export class ContentCalendarEntry {
  constructor(
    public readonly id: string,
    public companyId: string,
    public planId: string | null,
    public contentId: string | null,
    public scheduledFor: Date,
    public channel: string,
    public status: ContentCalendarStatus,
    public notes: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(input: {
    id?: string;
    companyId: string;
    planId?: string | null;
    contentId?: string | null;
    scheduledFor: Date;
    channel: string;
    status?: ContentCalendarStatus;
    notes?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }): ContentCalendarEntry {
    return new ContentCalendarEntry(
      input.id ?? crypto.randomUUID(),
      input.companyId,
      input.planId ?? null,
      input.contentId ?? null,
      input.scheduledFor,
      input.channel,
      input.status ?? 'PLANNED',
      input.notes ?? null,
      input.createdAt ?? new Date(),
      input.updatedAt ?? new Date(),
    );
  }

  static fromPersistence(input: {
    id: string;
    companyId: string;
    planId: string | null;
    contentId: string | null;
    scheduledFor: Date;
    channel: string;
    status: ContentCalendarStatus;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ContentCalendarEntry {
    return new ContentCalendarEntry(
      input.id,
      input.companyId,
      input.planId,
      input.contentId,
      input.scheduledFor,
      input.channel,
      input.status,
      input.notes,
      input.createdAt,
      input.updatedAt,
    );
  }
}
