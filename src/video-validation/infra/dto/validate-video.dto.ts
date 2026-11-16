import { IsNotEmpty, IsString } from 'class-validator';

export class ValidateVideoDto {
  @IsString()
  @IsNotEmpty()
  readonly videoAssetId: string;
}
