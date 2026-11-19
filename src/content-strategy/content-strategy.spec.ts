import { describe, expect, it, vi } from 'vitest';
import { GenerateContentIdeasUseCase } from './application/generate-content-ideas.use-case.js';
import { PlanContentCalendarUseCase } from './application/plan-content-calendar.use-case.js';
import { ContentPillar } from './domain/content-pillar.entity.js';
import { ContentIdea } from './domain/content-idea.entity.js';

describe('content strategy module', () => {
  it('generates ideas from available products', async () => {
    const companyRepository = {
      findById: vi.fn().mockResolvedValue({ id: 'company-1' }),
    };

    const brandRepository = {
      findById: vi.fn().mockResolvedValue({ id: 'brand-1', companyId: 'company-1' }),
    };

    const productRepository = {
      findByCompany: vi.fn().mockResolvedValue([
        { id: 'product-1', companyId: 'company-1', name: 'Protetor solar', description: 'Cobertura leve' },
      ]),
      findByBrand: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue({ id: 'product-1', companyId: 'company-1', name: 'Protetor solar', description: 'Cobertura leve' }),
    };

    const pillarRepository = {
      findById: vi.fn().mockResolvedValue(null),
      findByCompanyAndName: vi.fn().mockResolvedValue(null),
      create: vi.fn(async (pillar: ContentPillar) => pillar),
      findByCompany: vi.fn().mockResolvedValue([]),
    };

    const ideaRepository = {
      findByCompanyAndTitle: vi.fn().mockResolvedValue(null),
      create: vi.fn(async (idea: ContentIdea) => idea),
      findById: vi.fn(),
      findByCompany: vi.fn(),
      findByPillar: vi.fn(),
    };

    const aiService = {
      generateIdeas: vi.fn().mockResolvedValue([
        {
          title: 'Protetor solar em destaque',
          summary: 'Foco em conforto e proteção visual',
          targetAudience: 'Consumidores ativos',
          angle: 'Prova social e uso diário',
        },
      ]),
      buildCalendar: vi.fn().mockResolvedValue([
        { title: 'Protetor solar em destaque', objective: 'Aumentar alcance', scheduledFor: new Date('2026-11-20T00:00:00.000Z') },
      ]),
      compareSimilarity: vi.fn().mockResolvedValue({ score: 0.82, isSimilar: true }),
    };

    const useCase = new GenerateContentIdeasUseCase(
      companyRepository as any,
      brandRepository as any,
      productRepository as any,
      pillarRepository as any,
      ideaRepository as any,
      aiService as any,
    );

    const result = await useCase.execute({
      companyId: 'company-1',
      focus: 'verão',
      limit: 5,
    });

    expect(result).toHaveLength(1);
    expect(aiService.generateIdeas).toHaveBeenCalledTimes(1);
  });

  it('plans the calendar for selected ideas', async () => {
    const companyRepository = {
      findById: vi.fn().mockResolvedValue({ id: 'company-1' }),
    };

    const ideaRepository = {
      findById: vi.fn().mockResolvedValue({
        id: 'idea-1',
        companyId: 'company-1',
        title: 'Protetor solar em destaque',
        summary: 'Foco em conforto e proteção',
      }),
      findByCompany: vi.fn().mockResolvedValue([
        { id: 'idea-1', companyId: 'company-1', title: 'Protetor solar em destaque', summary: 'Foco em conforto e proteção' },
      ]),
      findByCompanyAndTitle: vi.fn(),
      findByPillar: vi.fn(),
    };

    const planRepository = {
      create: vi.fn(async (plan) => plan),
      update: vi.fn(async (plan) => plan),
      findById: vi.fn(),
      findByCompany: vi.fn(),
      findByCompanyAndStatus: vi.fn(),
    };

    const calendarRepository = {
      create: vi.fn(async (entry) => entry),
      findByCompany: vi.fn(),
      findByPlan: vi.fn(),
    };

    const aiService = {
      generateIdeas: vi.fn(),
      buildCalendar: vi.fn().mockResolvedValue([
        { title: 'Protetor solar em destaque', objective: 'Aumentar alcance', scheduledFor: new Date('2026-11-20T00:00:00.000Z') },
      ]),
      compareSimilarity: vi.fn(),
    };

    const useCase = new PlanContentCalendarUseCase(
      companyRepository as any,
      ideaRepository as any,
      planRepository as any,
      calendarRepository as any,
      aiService as any,
    );

    const result = await useCase.execute({
      companyId: 'company-1',
      ideaIds: ['idea-1'],
      startDate: new Date('2026-11-18T00:00:00.000Z'),
      days: 10,
      channel: 'Instagram',
    });

    expect(result.plans).toHaveLength(1);
    expect(aiService.buildCalendar).toHaveBeenCalledTimes(1);
  });
});
