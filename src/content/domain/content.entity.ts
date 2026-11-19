export type ContentStatus = 'DRAFT' | 'SCHEDULED' | 'APPROVED' | 'REJECTED' | 'PUBLISHED' | 'ARCHIVED';

export class Content {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly brandId: string | null,
    public readonly productId: string | null,
    public readonly title: string,
    public readonly slug: string,
    public status: ContentStatus,
    public readonly script: string | null,
    public readonly brief: string | null,
    public readonly editorialMetadata: Record<string, unknown> | null,
    public readonly embedding: number[] | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  approve() {
    this.status = 'APPROVED';
  }

  reject() {
    this.status = 'REJECTED';
  }

  publish() {
    this.status = 'PUBLISHED';
  }

  static create(props: {
    companyId: string;
    brandId?: string | null;
    productId?: string | null;
    title: string;
    slug: string;
    script?: string | null;
    brief?: string | null;
    editorialMetadata?: Record<string, unknown> | null;
    status?: ContentStatus;
    embedding?: number[] | null;
  }): Content {
    return new Content(
      crypto.randomUUID(),
      props.companyId,
      props.brandId ?? null,
      props.productId ?? null,
      props.title,
      props.slug,
      props.status ?? 'DRAFT',
      props.script ?? null,
      props.brief ?? null,
      props.editorialMetadata ?? null,
      props.embedding ?? null,
      new Date(),
      new Date(),
    );
  }
}
