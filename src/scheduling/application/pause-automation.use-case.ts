import { Injectable } from '@nestjs/common';
import { AutomationState } from '../domain/automation-state.entity.js';
import { AutomationStateRepository } from '../domain/automation-state.repository.interface.js';
import { SchedulingQueueService } from '../domain/queue.service.interface.js';

export type PauseAutomationInput = {
  companyId: string;
  queueName: 'content-planning' | 'video-generation' | 'video-validation' | 'social-publishing' | 'notifications';
  reason?: string;
};

@Injectable()
export class PauseAutomationUseCase {
  constructor(
    private readonly automationStateRepository: AutomationStateRepository,
    private readonly schedulingQueueService: SchedulingQueueService,
  ) {}

  async execute(input: PauseAutomationInput): Promise<{ companyId: string; queueName: string; paused: boolean; reason: string | null }> {
    let state = await this.automationStateRepository.findByCompanyAndQueue(input.companyId, input.queueName);
    if (!state) {
      state = AutomationState.create({ companyId: input.companyId, queueName: input.queueName });
      state = await this.automationStateRepository.create(state);
    }

    state.pause(input.reason);
    await this.automationStateRepository.update(state);
    await this.schedulingQueueService.pause(input.queueName, input.reason);

    return {
      companyId: state.companyId,
      queueName: state.queueName,
      paused: state.paused,
      reason: state.reason,
    };
  }
}
