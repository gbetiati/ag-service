import { describe, expect, it, vi } from 'vitest';
import { SchedulePublicationUseCase } from './application/schedule-publication.use-case.js';
import { PauseAutomationUseCase } from './application/pause-automation.use-case.js';
import { ScheduledPublicationQueue } from './application/scheduled-publication-queue.service.js';
import { AutomationState } from './domain/automation-state.entity.js';

describe('scheduling module', () => {
  it('schedules a publication for a future date', async () => {
    const scheduledFor = new Date(Date.now() + 240_000);
    const nextRunAt = new Date(scheduledFor.getTime() - 180_000);
    const schedules = {
      schedule: vi.fn().mockResolvedValue({
        id: 'schedule-1', companyId: 'company-1', publicationId: 'publication-1', stage: 'PREPARE',
        scheduledFor, nextRunAt, generation: null, contentIdeaId: null, errorMessage: null,
      }),
    };
    const queueService = { schedule: vi.fn().mockResolvedValue(undefined) };
    const useCase = new SchedulePublicationUseCase(schedules as any, new ScheduledPublicationQueue(queueService as any));
    const result = await useCase.execute({
      companyId: 'company-1',
      publicationId: 'publication-1',
      scheduledFor,
      queueName: 'social-publishing',
    });

    expect(result.status).toBe('SCHEDULED');
    expect(queueService.schedule).toHaveBeenCalledTimes(1);
    expect(queueService.schedule).toHaveBeenCalledWith(expect.objectContaining({
      queueName: 'content-planning',
      data: { id: 'schedule-1', companyId: 'company-1', stage: 'PREPARE', dueAt: nextRunAt.getTime() },
    }));
    expect(schedules.schedule.mock.invocationCallOrder[0]).toBeLessThan(queueService.schedule.mock.invocationCallOrder[0]);
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
    expect(queueService.pause).not.toHaveBeenCalled();
    expect(automationStateRepository.update).toHaveBeenCalledWith(expect.objectContaining({ paused: true }));
  });
});
