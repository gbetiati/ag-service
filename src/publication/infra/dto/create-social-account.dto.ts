export class CreateSocialAccountDto {
  platform!: 'INSTAGRAM';
  accountHandle!: string;
  displayName?: string | null;
  metadata?: Record<string, unknown> | null;
}
