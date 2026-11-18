import { Controller, Get, Param } from '@nestjs/common';
import { GetVideoGenerationJobsUseCase } from '../../application/get-video-generation-jobs.use-case.js';

@Controller('companies/:companyId/video-generation')
export class VideoGenerationQueueController {
  constructor(private readonly getVideoGenerationJobs: GetVideoGenerationJobsUseCase) {}

  @Get('jobs')
  listJobs(@Param('companyId') companyId: string) {
    return this.getVideoGenerationJobs.execute(companyId);
  }
}
