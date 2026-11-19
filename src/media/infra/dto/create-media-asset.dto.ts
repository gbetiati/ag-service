import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMediaAssetDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsOptional()
  @IsString()
  kind?: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
}
