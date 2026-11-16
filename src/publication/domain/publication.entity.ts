export type PublicationStatus = 'DRAFT' | 'QUEUED' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED' | 'REJECTED';

export class Publication {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly contentId: string,
    public readonly socialAccountId: string,
    public status: PublicationStatus,
    public readonly provider: string,
    public scheduledFor: Date | null,
    public publishedAt: Date | null,
    public externalPostId: string | null,
    public metadata: Record<string, unknown> | null,
    public errorMessage: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(input: {
    id?: string;
    companyId: string;
    contentId: string;
    socialAccountId: string;
    status?: PublicationStatus;
    provider: string;
    scheduledFor?: Date | null;
    publishedAt?: Date | null;
    externalPostId?: string | null;
    metadata?: Record<string, unknown> | null;
    errorMessage?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }): Publication {
    return new Publication(
      input.id ?? crypto.randomUUID(),
      input.companyId,
      input.contentId,
      input.socialAccountId,
      input.status ?? 'QUEUED',
      input.provider,
      input.scheduledFor ?? null,
      input.publishedAt ?? null,
      input.externalPostId ?? null,
      input.metadata ?? null,
      input.errorMessage ?? null,
      input.createdAt ?? new Date(),
      input.updatedAt ?? new Date(),
    );
  }

  markPublished(postId: string, metadata?: Record<string, unknown> | null) {
    this.status = 'PUBLISHED';
    this.externalPostId = postId;
    this.publishedAt = new Date();
    this.metadata = metadata ?? this.metadata;
    this.errorMessage = null;
  }

  reject(reason: string) {
    this.status = 'REJECTED';
    this.errorMessage = reason;
  }

  fail(reason: string) {
    this.status = 'FAILED';
    this.errorMessage = reason;
  }
}

