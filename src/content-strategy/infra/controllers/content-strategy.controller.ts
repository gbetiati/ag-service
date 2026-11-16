import { Body, Controller, Param, Post } from '@nestjs/common';
import { CheckContentSimilarityUseCase } from '../../application/check-content-similarity.use-case.js';
import { CreateContentPillarUseCase } from '../../application/create-content-pillar.use-case.js';
import { GenerateContentIdeasUseCase } from '../../application/generate-content-ideas.use-case.js';
import { PlanContentCalendarUseCase } from '../../application/plan-content-calendar.use-case.js';
import { SelectProductsForContentUseCase } from '../../application/select-products-for-content.use-case.js';
import { CheckContentSimilarityDto } from '../dto/check-content-similarity.dto.js';
import { CreateContentPillarDto } from '../dto/create-content-pillar.dto.js';
import { GenerateContentIdeasDto } from '../dto/generate-content-ideas.dto.js';
import { PlanContentCalendarDto } from '../dto/plan-content-calendar.dto.js';
import { SelectProductsForContentDto } from '../dto/select-products-for-content.dto.js';

@Controller('companies/:companyId/content-strategy')
export class ContentStrategyController {
  constructor(
    private readonly createContentPillarUseCase: CreateContentPillarUseCase,
    private readonly generateContentIdeasUseCase: GenerateContentIdeasUseCase,
    private readonly selectProductsForContentUseCase: SelectProductsForContentUseCase,
    private readonly planContentCalendarUseCase: PlanContentCalendarUseCase,
    private readonly checkContentSimilarityUseCase: CheckContentSimilarityUseCase,
  ) {}

  @Post('pillars')
  async createPillar(@Param('companyId') companyId: string, @Body() body: CreateContentPillarDto) {
    return this.createContentPillarUseCase.execute({ companyId, name: body.name, description: body.description ?? null });
  }

  @Post('ideas/generate')
  async generateIdeas(@Param('companyId') companyId: string, @Body() body: GenerateContentIdeasDto) {
    return this.generateContentIdeasUseCase.execute({
      companyId,
      brandId: body.brandId ?? null,
      pillarId: body.pillarId ?? null,
      pillarName: body.pillarName ?? null,
      productIds: body.productIds ?? [],
      focus: body.focus ?? null,
      limit: body.limit ?? 5,
    });
  }

  @Post('products/select')
  async selectProducts(@Param('companyId') companyId: string, @Body() body: SelectProductsForContentDto) {
    return this.selectProductsForContentUseCase.execute({
      companyId,
      brandId: body.brandId ?? null,
      goal: body.goal ?? null,
      limit: body.limit ?? 5,
    });
  }

  @Post('calendar/plan')
  async planCalendar(@Param('companyId') companyId: string, @Body() body: PlanContentCalendarDto) {
    return this.planContentCalendarUseCase.execute({
      companyId,
      brandId: body.brandId ?? null,
      ideaIds: body.ideaIds ?? [],
      startDate: new Date(body.startDate),
      days: body.days ?? 30,
      channel: body.channel ?? 'Instagram',
    });
  }

  @Post('similarity/check')
  async checkSimilarity(@Param('companyId') companyId: string, @Body() body: CheckContentSimilarityDto) {
    return this.checkContentSimilarityUseCase.execute({
      companyId,
      firstIdeaId: body.firstIdeaId,
      secondIdeaId: body.secondIdeaId,
    });
  }
}
