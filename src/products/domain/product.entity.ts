export type ProductStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';

export class Product {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly name: string,
    public readonly slug: string,
    public readonly sku: string | null,
    public readonly description: string | null,
    public readonly priceCents: number | null,
    public readonly status: ProductStatus,
    public readonly brandId: string | null,
    public readonly categoryId: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(props: {
    companyId: string;
    name: string;
    slug: string;
    sku?: string | null;
    description?: string | null;
    priceCents?: number | null;
    status?: ProductStatus;
    brandId?: string | null;
    categoryId?: string | null;
  }): Product {
    return new Product(
      crypto.randomUUID(),
      props.companyId,
      props.name,
      props.slug,
      props.sku ?? null,
      props.description ?? null,
      props.priceCents ?? null,
      props.status ?? 'ACTIVE',
      props.brandId ?? null,
      props.categoryId ?? null,
      new Date(),
      new Date(),
    );
  }
}
