export class CreateProcessingHistoryDto {
  entityType: string;
  entityId: string;
  stage: string;
  status: string;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
}
