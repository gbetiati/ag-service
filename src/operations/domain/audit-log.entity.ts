export class AuditLog {
  constructor(
    public readonly id: string,
    public companyId: string,
    public actorType: string,
    public actorId: string | null,
    public resourceType: string,
    public resourceId: string | null,
    public action: string,
    public details: Record<string, unknown> | null,
    public readonly createdAt: Date,
  ) {}

  static create(input: {
    id?: string;
    companyId: string;
    actorType: string;
    actorId?: string | null;
    resourceType: string;
    resourceId?: string | null;
    action: string;
    details?: Record<string, unknown> | null;
    createdAt?: Date;
  }): AuditLog {
    return new AuditLog(
      input.id ?? crypto.randomUUID(),
      input.companyId,
      input.actorType,
      input.actorId ?? null,
      input.resourceType,
      input.resourceId ?? null,
      input.action,
      input.details ?? null,
      input.createdAt ?? new Date(),
    );
  }
}
