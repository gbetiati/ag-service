export type SocialPlatform = 'INSTAGRAM';
export type SocialAccountStatus = 'ACTIVE' | 'INACTIVE' | 'REVOKED';

export class SocialAccount {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly platform: SocialPlatform,
    public readonly accountHandle: string,
    public readonly displayName: string | null,
    public status: SocialAccountStatus,
    public readonly metadata: Record<string, unknown> | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(input: {
    id?: string;
    companyId: string;
    platform: SocialPlatform;
    accountHandle: string;
    displayName?: string | null;
    status?: SocialAccountStatus;
    metadata?: Record<string, unknown> | null;
    createdAt?: Date;
    updatedAt?: Date;
  }): SocialAccount {
    return new SocialAccount(
      input.id ?? crypto.randomUUID(),
      input.companyId,
      input.platform,
      input.accountHandle,
      input.displayName ?? null,
      input.status ?? 'ACTIVE',
      input.metadata ?? null,
      input.createdAt ?? new Date(),
      input.updatedAt ?? new Date(),
    );
  }

  deactivate() {
    this.status = 'INACTIVE';
  }

  revoke() {
    this.status = 'REVOKED';
  }
}
