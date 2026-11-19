import { IsOptional, IsString } from 'class-validator';

export class PauseAutomationDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
