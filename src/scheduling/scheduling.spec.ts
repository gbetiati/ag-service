import { describe, expect, it, vi } from 'vitest';
import { Publication } from '../publication/domain/publication.entity.js';
import { SchedulePublicationUseCase } from './application/schedule-publication.use-case.js';
import { PauseAutomationUseCase } from './application/pause-automation.use-case.js';
import { AutomationState } from './domain/automation-state.entity.js';

describe('scheduling module', () => {
  it('schedules a publication for a future date', async () => {
    const publication = Publication.create({
      companyId: 'company-1',
      contentId: 'content-1',
      socialAccountId: 'account-1',
      provider: 'INSTAGRAM',
    });

    const publicationRepository = {
      findById: vi.fn().mockResolvedValue(publication),
      update: vi.fn(async (entity: Publication) => entity),
    };

    const automationStateRepository = {
      findByCompanyAndQueue: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
    };

    const queueService = {
      schedule: vi.fn().mockResolvedValue({ queueName: 'social-publishing', jobId: 'job-1', status: 'scheduled' }),
      pause: vi.fn(),
      resume: vi.fn(),
      getQueueStatus: vi.fn(),
    };

    const useCase = new SchedulePublicationUseCase(publicationRepository as any, automationStateRepository as any, queueService as any);
    const result = await useCase.execute({
      companyId: 'company-1',
      publicationId: publication.id,
      scheduledFor: new Date(Date.now() + 60_000),
      queueName: 'social-publishing',
    });

    expect(result.status).toBe('SCHEDULED');
    expect(queueService.schedule).toHaveBeenCalledTimes(1);
  });

  it('pauses automation for a company queue', async () => {
    const state = AutomationState.create({ companyId: 'company-1', queueName: 'social-publishing' });
    const automationStateRepository = {
      findByCompanyAndQueue: vi.fn().mockResolvedValue(state),
      create: vi.fn(),
      update: vi.fn(async (entity: AutomationState) => entity),
    };

    const queueService = {
      schedule: vi.fn(),
      pause: vi.fn().mockResolvedValue(undefined),
      resume: vi.fn(),
      getQueueStatus: vi.fn(),
    };

    const useCase = new PauseAutomationUseCase(automationStateRepository as any, queueService as any);
    const result = await useCase.execute({ companyId: 'company-1', queueName: 'social-publishing', reason: 'Maintenance window' });

    expect(result.paused).toBe(true);
    expect(queueService.pause).toHaveBeenCalledTimes(1);
  });
});
