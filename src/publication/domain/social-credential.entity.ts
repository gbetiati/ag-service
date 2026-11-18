export type SocialCredentialKind = 'ACCESS_TOKEN' | 'REFRESH_TOKEN';

export class SocialCredential {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly socialAccountId: string,
    public readonly kind: SocialCredentialKind,
    public readonly encryptedValue: string,
    public readonly initializationVector: string,
    public readonly expiresAt: Date | null,
    public readonly scopes: Record<string, unknown> | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(input: {
    id?: string;
    companyId: string;
    socialAccountId: string;
    kind: SocialCredentialKind;
    encryptedValue: string;
    initializationVector: string;
    expiresAt?: Date | null;
    scopes?: Record<string, unknown> | null;
    createdAt?: Date;
    updatedAt?: Date;
  }): SocialCredential {
    return new SocialCredential(
      input.id ?? crypto.randomUUID(),
      input.companyId,
      input.socialAccountId,
      input.kind,
      input.encryptedValue,
      input.initializationVector,
      input.expiresAt ?? null,
      input.scopes ?? null,
      input.createdAt ?? new Date(),
      input.updatedAt ?? new Date(),
    );
  }

  isExpired(now: Date = new Date()): boolean {
    return this.expiresAt !== null && this.expiresAt.getTime() <= now.getTime();
  }

  isActive(now: Date = new Date()): boolean {
    return !this.isExpired(now);
  }
}
