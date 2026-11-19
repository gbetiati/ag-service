import { AuditLog } from './audit-log.entity.js';

export abstract class AuditLogRepository {
  abstract create(log: AuditLog): Promise<AuditLog>;
  abstract findByCompany(companyId: string): Promise<AuditLog[]>;
  abstract findByResource(resourceType: string, resourceId: string): Promise<AuditLog[]>;
}
