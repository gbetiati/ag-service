export class BrandRule {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly brandId: string,
    public readonly title: string,
    public readonly ruleText: string,
    public readonly isRequired: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(props: { companyId: string; brandId: string; title: string; ruleText: string; isRequired?: boolean }): BrandRule {
    return new BrandRule(
      crypto.randomUUID(),
      props.companyId,
      props.brandId,
      props.title,
      props.ruleText,
      props.isRequired ?? true,
      new Date(),
      new Date(),
    );
  }
}
