import { IsIn, IsObject, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class CreateSocialAccountDto {
  @IsIn(['INSTAGRAM'])
  platform!: 'INSTAGRAM';

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  accountHandle!: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(255)
  displayName?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsObject()
  metadata?: Record<string, unknown> | null;
}
