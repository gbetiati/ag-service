export type BrandStatus = 'ACTIVE' | 'ARCHIVED';

export class Brand {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly name: string,
    public readonly slug: string,
    public readonly description: string | null,
    public readonly status: BrandStatus,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(props: { companyId: string; name: string; slug: string; description?: string | null; status?: BrandStatus }): Brand {
    return new Brand(
      crypto.randomUUID(),
      props.companyId,
      props.name,
      props.slug,
      props.description ?? null,
      props.status ?? 'ACTIVE',
      new Date(),
      new Date(),
    );
  }
}
