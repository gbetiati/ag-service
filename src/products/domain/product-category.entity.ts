export class ProductCategory {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly name: string,
    public readonly slug: string,
    public readonly description: string | null,
    public readonly parentId: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(props: { companyId: string; name: string; slug: string; description?: string | null; parentId?: string | null }): ProductCategory {
    return new ProductCategory(
      crypto.randomUUID(),
      props.companyId,
      props.name,
      props.slug,
      props.description ?? null,
      props.parentId ?? null,
      new Date(),
      new Date(),
    );
  }
}
