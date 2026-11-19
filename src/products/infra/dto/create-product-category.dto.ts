import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreateProductCategoryDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 120)
  name: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 80)
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}
