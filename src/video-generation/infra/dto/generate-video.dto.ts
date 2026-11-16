import { IsArray, IsOptional, IsString } from 'class-validator';

export class GenerateVideoDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sourceMediaAssetIds?: string[];

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  outputFormat?: string;
}
