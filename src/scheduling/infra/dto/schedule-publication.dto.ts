import { IsDateString, IsOptional, IsString } from 'class-validator';

export class SchedulePublicationDto {
  @IsDateString()
  scheduledFor!: string;

  @IsOptional()
  @IsString()
  queueName?: 'content-planning' | 'video-generation' | 'video-validation' | 'social-publishing' | 'notifications';
}
