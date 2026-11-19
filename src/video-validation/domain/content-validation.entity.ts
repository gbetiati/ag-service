import { ValidationStatus } from './validation-status.type.js';

export class ValidationResult {
  constructor(
    public readonly id: string,
    public readonly validationId: string,
    public readonly checkName: string,
    public readonly status: ValidationStatus,
    public readonly passed: boolean,
    public readonly score: number | null,
    public readonly details: Record<string, unknown> | null,
    public readonly evidence: Record<string, unknown> | null,
    public readonly createdAt: Date,
  ) {}
}

export class ContentValidation {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly contentId: string,
    public readonly videoAssetId: string,
    public readonly status: ValidationStatus,
    public readonly validatorVersion: string,
    public readonly summary: string | null,
    public readonly failureReason: string | null,
    public readonly startedAt: Date | null,
    public readonly completedAt: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(props: {
    companyId: string;
    contentId: string;
    videoAssetId: string;
    status?: ValidationStatus;
    validatorVersion: string;
    summary?: string | null;
    failureReason?: string | null;
    startedAt?: Date | null;
    completedAt?: Date | null;
  }): ContentValidation {
    const now = new Date();
    return new ContentValidation(
      crypto.randomUUID(),
      props.companyId,
      props.contentId,
      props.videoAssetId,
      props.status ?? 'PENDING',
      props.validatorVersion,
      props.summary ?? null,
      props.failureReason ?? null,
      props.startedAt ?? null,
      props.completedAt ?? null,
      now,
      now,
    );
  }
}
