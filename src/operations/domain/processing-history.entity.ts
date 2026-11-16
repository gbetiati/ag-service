export class ProcessingHistory {
  constructor(
    public readonly id: string,
    public companyId: string,
    public entityType: string,
    public entityId: string,
    public stage: string,
    public status: string,
    public message: string | null,
    public metadata: Record<string, unknown> | null,
    public readonly createdAt: Date,
  ) {}

  static create(input: {
    id?: string;
    companyId: string;
    entityType: string;
    entityId: string;
    stage: string;
    status: string;
    message?: string | null;
    metadata?: Record<string, unknown> | null;
    createdAt?: Date;
  }): ProcessingHistory {
    return new ProcessingHistory(
      input.id ?? crypto.randomUUID(),
      input.companyId,
      input.entityType,
      input.entityId,
      input.stage,
      input.status,
      input.message ?? null,
      input.metadata ?? null,
      input.createdAt ?? new Date(),
    );
  }
}
