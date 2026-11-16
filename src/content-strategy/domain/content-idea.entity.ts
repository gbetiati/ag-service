export type ContentIdeaStatus = 'DRAFT' | 'READY' | 'ARCHIVED';

export class ContentIdea {
  constructor(
    public readonly id: string,
    public companyId: string,
    public pillarId: string | null,
    public brandId: string | null,
    public productId: string | null,
    public title: string,
    public summary: string,
    public targetAudience: string | null,
    public angle: string | null,
    public status: ContentIdeaStatus,
    public embedding: number[] | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(input: {
    id?: string;
    companyId: string;
    pillarId?: string | null;
    brandId?: string | null;
    productId?: string | null;
    title: string;
    summary: string;
    targetAudience?: string | null;
    angle?: string | null;
    status?: ContentIdeaStatus;
    embedding?: number[] | null;
    createdAt?: Date;
    updatedAt?: Date;
  }): ContentIdea {
    return new ContentIdea(
      input.id ?? crypto.randomUUID(),
      input.companyId,
      input.pillarId ?? null,
      input.brandId ?? null,
      input.productId ?? null,
      input.title,
      input.summary,
      input.targetAudience ?? null,
      input.angle ?? null,
      input.status ?? 'DRAFT',
      input.embedding ?? null,
      input.createdAt ?? new Date(),
      input.updatedAt ?? new Date(),
    );
  }

  static fromPersistence(input: {
    id: string;
    companyId: string;
    pillarId: string | null;
    brandId: string | null;
    productId: string | null;
    title: string;
    summary: string;
    targetAudience: string | null;
    angle: string | null;
    status: ContentIdeaStatus;
    embedding: number[] | null;
    createdAt: Date;
    updatedAt: Date;
  }): ContentIdea {
    return new ContentIdea(
      input.id,
      input.companyId,
      input.pillarId,
      input.brandId,
      input.productId,
      input.title,
      input.summary,
      input.targetAudience,
      input.angle,
      input.status,
      input.embedding,
      input.createdAt,
      input.updatedAt,
    );
  }
}
