import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { GenerateVideoUseCase } from '../../application/generate-video.use-case.js';
import { GetVideoGenerationStatusUseCase } from '../../application/get-video-generation-status.use-case.js';
import { RenderVideoUseCase } from '../../application/render-video.use-case.js';
import { GenerateVideoDto } from '../dto/generate-video.dto.js';

@Controller('companies/:companyId/content/:contentId/video-generation')
export class VideoGenerationController {
  constructor(
    private readonly generateVideoUseCase: GenerateVideoUseCase,
    private readonly renderVideoUseCase: RenderVideoUseCase,
    private readonly getVideoGenerationStatusUseCase: GetVideoGenerationStatusUseCase,
  ) {}

  @Post()
  async generate(
    @Param('companyId') companyId: string,
    @Param('contentId') contentId: string,
    @Body() body: GenerateVideoDto,
  ) {
    return this.generateVideoUseCase.execute({
      companyId,
      contentId,
      sourceMediaAssetIds: body.sourceMediaAssetIds ?? [],
      provider: body.provider ?? 'CREATOMATE',
      outputFormat: body.outputFormat ?? 'mp4',
    });
  }

  @Post(':videoAssetId/render')
  async render(@Param('companyId') companyId: string, @Param('videoAssetId') videoAssetId: string) {
    return this.renderVideoUseCase.execute({ companyId, videoAssetId });
  }

  @Get(':videoAssetId/status')
  async status(@Param('companyId') companyId: string, @Param('videoAssetId') videoAssetId: string) {
    return this.getVideoGenerationStatusUseCase.execute({ companyId, videoAssetId });
  }
}
