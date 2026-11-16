export class CreateSocialCredentialDto {
  kind!: 'ACCESS_TOKEN' | 'REFRESH_TOKEN';
  secret!: string;
  expiresAt?: Date | null;
  scopes?: Record<string, unknown> | null;
}
