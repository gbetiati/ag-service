export class CreatePublicationDto {
  contentId!: string;
  socialAccountId!: string;
  provider?: string;
  scheduledFor?: Date | string | null;
}
