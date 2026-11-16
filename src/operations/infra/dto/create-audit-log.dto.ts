export class CreateAuditLogDto {
  actorType: string;
  actorId?: string | null;
  resourceType: string;
  resourceId?: string | null;
  action: string;
  details?: Record<string, unknown> | null;
}
