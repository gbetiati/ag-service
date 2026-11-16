export type CompanyStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export class Company {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly slug: string,
    public readonly description: string | null,
    public readonly status: CompanyStatus,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(props: { name: string; slug: string; description?: string | null; status?: CompanyStatus }): Company {
    return new Company(
      crypto.randomUUID(),
      props.name,
      props.slug,
      props.description ?? null,
      props.status ?? 'ACTIVE',
      new Date(),
      new Date(),
    );
  }
}
