import { Injectable, NotFoundException } from '@nestjs/common';
import { AutomationStateRepository } from '../domain/automation-state.repository.interface.js';
import { SchedulingQueueService } from '../domain/queue.service.interface.js';

export type ResumeAutomationInput = {
  companyId: string;
  queueName: 'content-planning' | 'video-generation' | 'video-validation' | 'social-publishing' | 'notifications';
};

@Injectable()
export class ResumeAutomationUseCase {
  constructor(
    private readonly automationStateRepository: AutomationStateRepository,
    private readonly schedulingQueueService: SchedulingQueueService,
  ) {}

  async execute(input: ResumeAutomationInput): Promise<{ companyId: string; queueName: string; paused: boolean }> {
    const state = await this.automationStateRepository.findByCompanyAndQueue(input.companyId, input.queueName);
    if (!state) {
      throw new NotFoundException('Automation state not found for this company and queue.');
    }

    state.resume();
    await this.automationStateRepository.update(state);
    if (input.queueName === 'notifications') {
      await this.schedulingQueueService.resume(input.queueName);
    }

    return {
      companyId: state.companyId,
      queueName: state.queueName,
      paused: state.paused,
    };
  }
}
