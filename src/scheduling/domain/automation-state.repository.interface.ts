import { AutomationState } from './automation-state.entity.js';

export abstract class AutomationStateRepository {
  abstract create(state: AutomationState): Promise<AutomationState>;
  abstract update(state: AutomationState): Promise<AutomationState>;
  abstract findByCompanyAndQueue(companyId: string, queueName: string): Promise<AutomationState | null>;
}
