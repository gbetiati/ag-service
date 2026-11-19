import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreateContentDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 160)
  title: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 120)
  slug: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  script?: string;

  @IsOptional()
  @IsString()
  brief?: string;
}
