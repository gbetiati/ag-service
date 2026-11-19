import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class PublishContentDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  socialAccountId!: string;
}
