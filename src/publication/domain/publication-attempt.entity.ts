export type PublicationAttemptStatus = 'QUEUED' | 'PUBLISHED' | 'FAILED' | 'REJECTED';

export class PublicationAttempt {
  constructor(
    public readonly id: string,
    public readonly publicationId: string,
    public readonly attemptNumber: number,
    public status: PublicationAttemptStatus,
    public readonly providerResponse: Record<string, unknown> | null,
    public errorMessage: string | null,
    public readonly createdAt: Date,
  ) {}

  static create(input: {
    id?: string;
    publicationId: string;
    attemptNumber: number;
    status?: PublicationAttemptStatus;
    providerResponse?: Record<string, unknown> | null;
    errorMessage?: string | null;
    createdAt?: Date;
  }): PublicationAttempt {
    return new PublicationAttempt(
      input.id ?? crypto.randomUUID(),
      input.publicationId,
      input.attemptNumber,
      input.status ?? 'QUEUED',
      input.providerResponse ?? null,
      input.errorMessage ?? null,
      input.createdAt ?? new Date(),
    );
  }
}
