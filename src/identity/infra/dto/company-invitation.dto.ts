import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCompanyInvitationDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsIn(['ADMIN', 'MEMBER'])
  role!: 'ADMIN' | 'MEMBER';
}

export class AcceptCompanyInvitationDto {
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  token!: string;
}
