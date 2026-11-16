import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

export enum ContentStatusValue {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export class UpdateContentDto {
  @IsOptional()
  @IsString()
  @Length(2, 160)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  slug?: string;

  @IsOptional()
  @IsString()
  script?: string;

  @IsOptional()
  @IsString()
  brief?: string;

  @IsOptional()
  @IsEnum(ContentStatusValue)
  status?: ContentStatusValue;
}
