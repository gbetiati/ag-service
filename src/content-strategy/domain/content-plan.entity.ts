export type ContentPlanStatus = 'DRAFT' | 'READY' | 'SCHEDULED' | 'ARCHIVED';

export class ContentPlan {
  constructor(
    public readonly id: string,
    public companyId: string,
    public pillarId: string | null,
    public brandId: string | null,
    public title: string,
    public objective: string | null,
    public status: ContentPlanStatus,
    public scheduledFor: Date | null,
    public metadata: Record<string, unknown> | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(input: {
    id?: string;
    companyId: string;
    pillarId?: string | null;
    brandId?: string | null;
    title: string;
    objective?: string | null;
    status?: ContentPlanStatus;
    scheduledFor?: Date | null;
    metadata?: Record<string, unknown> | null;
    createdAt?: Date;
    updatedAt?: Date;
  }): ContentPlan {
    return new ContentPlan(
      input.id ?? crypto.randomUUID(),
      input.companyId,
      input.pillarId ?? null,
      input.brandId ?? null,
      input.title,
      input.objective ?? null,
      input.status ?? 'DRAFT',
      input.scheduledFor ?? null,
      input.metadata ?? null,
      input.createdAt ?? new Date(),
      input.updatedAt ?? new Date(),
    );
  }

  static fromPersistence(input: {
    id: string;
    companyId: string;
    pillarId: string | null;
    brandId: string | null;
    title: string;
    objective: string | null;
    status: ContentPlanStatus;
    scheduledFor: Date | null;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
  }): ContentPlan {
    return new ContentPlan(
      input.id,
      input.companyId,
      input.pillarId,
      input.brandId,
      input.title,
      input.objective,
      input.status,
      input.scheduledFor,
      input.metadata,
      input.createdAt,
      input.updatedAt,
    );
  }
}
