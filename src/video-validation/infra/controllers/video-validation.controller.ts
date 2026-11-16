import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { GetValidationReportUseCase } from '../../application/get-validation-report.use-case.js';
import { RevalidateVideoUseCase } from '../../application/revalidate-video.use-case.js';
import { ValidateVideoUseCase } from '../../application/validate-video.use-case.js';
import { ValidateVideoDto } from '../dto/validate-video.dto.js';

@Controller('companies/:companyId/content/:contentId/validation')
export class VideoValidationController {
  constructor(
    private readonly validateVideoUseCase: ValidateVideoUseCase,
    private readonly revalidateVideoUseCase: RevalidateVideoUseCase,
    private readonly getValidationReportUseCase: GetValidationReportUseCase,
  ) {}

  @Post()
  async validate(@Param('companyId') companyId: string, @Param('contentId') contentId: string, @Body() body: ValidateVideoDto) {
    return this.validateVideoUseCase.execute({ companyId, contentId, videoAssetId: body.videoAssetId });
  }

  @Post('revalidate')
  async revalidate(@Param('companyId') companyId: string, @Param('contentId') contentId: string, @Body() body: ValidateVideoDto) {
    return this.revalidateVideoUseCase.execute({ companyId, contentId, videoAssetId: body.videoAssetId });
  }

  @Get()
  async getReport(@Param('companyId') companyId: string, @Param('contentId') contentId: string) {
    return this.getValidationReportUseCase.execute({ companyId, contentId });
  }
}
