import { Injectable, NotFoundException } from '@nestjs/common';
import { CompanyRepository } from '../../companies/domain/company.repository.interface.js';
import { ContentCalendarEntry } from '../domain/content-calendar.entity.js';
import { ContentCalendarRepository } from '../domain/content-calendar.repository.interface.js';
import { ContentIdeaRepository } from '../domain/content-idea.repository.interface.js';
import { ContentPlan } from '../domain/content-plan.entity.js';
import { ContentPlanRepository } from '../domain/content-plan.repository.interface.js';
import { ContentStrategyAiService } from '../domain/content-strategy-ai.service.interface.js';

export type PlanContentCalendarInput = {
  companyId: string;
  brandId?: string | null;
  ideaIds?: string[];
  startDate: Date;
  days: number;
  channel?: string;
};

@Injectable()
export class PlanContentCalendarUseCase {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly contentIdeaRepository: ContentIdeaRepository,
    private readonly contentPlanRepository: ContentPlanRepository,
    private readonly contentCalendarRepository: ContentCalendarRepository,
    private readonly contentStrategyAiService: ContentStrategyAiService,
  ) {}

  async execute(input: PlanContentCalendarInput) {
    const company = await this.companyRepository.findById(input.companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const ideas = input.ideaIds?.length
      ? (await Promise.all(input.ideaIds.map((id) => this.contentIdeaRepository.findById(id)))).filter(
          (idea): idea is NonNullable<typeof idea> => Boolean(idea && idea.companyId === company.id),
        )
      : await this.contentIdeaRepository.findByCompany(company.id);

    if (ideas.length === 0) {
      throw new NotFoundException('No ideas available to create a content calendar');
    }

    const slots = await this.contentStrategyAiService.buildCalendar({
      companyId: company.id,
      brandId: input.brandId ?? null,
      ideaTitles: ideas.map((idea) => idea.title),
      startDate: new Date(input.startDate),
      days: Math.max(7, input.days ?? 30),
    });

    const plans: ContentPlan[] = [];
    const calendarEntries: ContentCalendarEntry[] = [];

    for (const slot of slots) {
      const contentPlan = ContentPlan.create({
        companyId: company.id,
        brandId: input.brandId ?? null,
        title: slot.title,
        objective: slot.objective,
        status: 'READY',
        scheduledFor: slot.scheduledFor,
        metadata: { channel: input.channel ?? 'Instagram' },
      });

      const savedPlan = await this.contentPlanRepository.create(contentPlan);
      const entry = ContentCalendarEntry.create({
        companyId: company.id,
        planId: savedPlan.id,
        scheduledFor: slot.scheduledFor,
        channel: input.channel ?? 'Instagram',
        notes: slot.objective,
      });

      calendarEntries.push(await this.contentCalendarRepository.create(entry));
      plans.push(savedPlan);
    }

    return {
      companyId: company.id,
      plans,
      calendarEntries,
    };
  }
}
