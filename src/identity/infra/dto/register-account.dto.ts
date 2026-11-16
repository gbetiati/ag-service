import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class RegisterAccountDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;

  @ValidateIf(input => !input.invitationToken)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  companyName?: string;

  @ValidateIf(input => !input.invitationToken)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i)
  companySlug?: string;

  @IsOptional()
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  invitationToken?: string;
}
