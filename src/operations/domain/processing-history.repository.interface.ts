import { ProcessingHistory } from './processing-history.entity.js';

export abstract class ProcessingHistoryRepository {
  abstract create(processingHistory: ProcessingHistory): Promise<ProcessingHistory>;
  abstract findByCompany(companyId: string): Promise<ProcessingHistory[]>;
  abstract findByEntity(companyId: string, entityType: string, entityId: string): Promise<ProcessingHistory[]>;
}
