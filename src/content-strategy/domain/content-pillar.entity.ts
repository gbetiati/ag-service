export type ContentPillarStatus = 'ACTIVE' | 'ARCHIVED';

export class ContentPillar {
  constructor(
    public readonly id: string,
    public companyId: string,
    public name: string,
    public description: string | null,
    public status: ContentPillarStatus,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(input: {
    id?: string;
    companyId: string;
    name: string;
    description?: string | null;
    status?: ContentPillarStatus;
    createdAt?: Date;
    updatedAt?: Date;
  }): ContentPillar {
    return new ContentPillar(
      input.id ?? crypto.randomUUID(),
      input.companyId,
      input.name,
      input.description ?? null,
      input.status ?? 'ACTIVE',
      input.createdAt ?? new Date(),
      input.updatedAt ?? new Date(),
    );
  }

  static fromPersistence(input: {
    id: string;
    companyId: string;
    name: string;
    description: string | null;
    status: ContentPillarStatus;
    createdAt: Date;
    updatedAt: Date;
  }): ContentPillar {
    return new ContentPillar(
      input.id,
      input.companyId,
      input.name,
      input.description,
      input.status,
      input.createdAt,
      input.updatedAt,
    );
  }
}
