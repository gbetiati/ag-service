import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateContentDto } from '../dto/create-content.dto.js';
import { UpdateContentDto } from '../dto/update-content.dto.js';
import { CreateContentUseCase } from '../../application/create-content.use-case.js';
import { UpdateContentUseCase } from '../../application/update-content.use-case.js';
import { GetContentHistoryUseCase } from '../../application/get-content-history.use-case.js';
import { GetContentDetailsUseCase } from '../../application/get-content-details.use-case.js';

@Controller('companies/:companyId/content')
export class ContentController {
  constructor(
    private readonly createContentUseCase: CreateContentUseCase,
    private readonly updateContentUseCase: UpdateContentUseCase,
    private readonly getContentHistoryUseCase: GetContentHistoryUseCase,
    private readonly getContentDetailsUseCase: GetContentDetailsUseCase,
  ) {}

  @Post()
  async create(@Param('companyId') companyId: string, @Body() body: CreateContentDto) {
    return this.createContentUseCase.execute({
      companyId,
      brandId: body.brandId ?? null,
      productId: body.productId ?? null,
      title: body.title,
      slug: body.slug,
      script: body.script ?? null,
      brief: body.brief ?? null,
    });
  }

  @Patch(':contentId')
  async update(@Param('companyId') companyId: string, @Param('contentId') contentId: string, @Body() body: UpdateContentDto) {
    return this.updateContentUseCase.execute({
      companyId,
      contentId,
      title: body.title,
      slug: body.slug,
      status: body.status as any,
      script: body.script ?? null,
      brief: body.brief ?? null,
    });
  }

  @Get(':contentId')
  async getDetails(@Param('companyId') companyId: string, @Param('contentId') contentId: string) {
    return this.getContentDetailsUseCase.execute({ companyId, contentId });
  }

  @Get(':contentId/history')
  async getHistory(@Param('companyId') companyId: string, @Param('contentId') contentId: string) {
    return this.getContentHistoryUseCase.execute({ companyId, contentId });
  }
}
