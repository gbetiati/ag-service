import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { AutomationState } from '../../domain/automation-state.entity.js';
import { AutomationStateRepository } from '../../domain/automation-state.repository.interface.js';

@Injectable()
export class PrismaAutomationStateRepository extends AutomationStateRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(state: AutomationState): Promise<AutomationState> {
    const record = await this.prisma.automationState.create({
      data: {
        id: state.id,
        companyId: state.companyId,
        queueName: state.queueName,
        paused: state.paused,
        reason: state.reason,
        createdAt: state.createdAt,
        updatedAt: state.updatedAt,
      },
    });

    return this.toEntity(record);
  }

  async update(state: AutomationState): Promise<AutomationState> {
    const record = await this.prisma.automationState.update({
      where: { id: state.id },
      data: {
        companyId: state.companyId,
        queueName: state.queueName,
        paused: state.paused,
        reason: state.reason,
        updatedAt: state.updatedAt,
      },
    });

    return this.toEntity(record);
  }

  async findByCompanyAndQueue(companyId: string, queueName: string): Promise<AutomationState | null> {
    const record = await this.prisma.automationState.findUnique({
      where: { companyId_queueName: { companyId, queueName } },
    });

    return record ? this.toEntity(record) : null;
  }

  private toEntity(record: {
    id: string;
    companyId: string;
    queueName: string;
    paused: boolean;
    reason: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): AutomationState {
    return new AutomationState(
      record.id,
      record.companyId,
      record.queueName,
      record.paused,
      record.reason,
      record.createdAt,
      record.updatedAt,
    );
  }
}
