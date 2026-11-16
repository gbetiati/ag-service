import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { ContentPlan } from '../../domain/content-plan.entity.js';
import { ContentPlanRepository } from '../../domain/content-plan.repository.interface.js';

@Injectable()
export class PrismaContentPlanRepository extends ContentPlanRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(contentPlan: ContentPlan): Promise<ContentPlan> {
    const created = await this.prisma.contentPlan.create({
      data: {
        id: contentPlan.id,
        companyId: contentPlan.companyId,
        pillarId: contentPlan.pillarId,
        brandId: contentPlan.brandId,
        title: contentPlan.title,
        objective: contentPlan.objective,
        status: contentPlan.status,
        scheduledFor: contentPlan.scheduledFor,
        metadata: contentPlan.metadata as any,
      },
    });

    return ContentPlan.fromPersistence({
      id: created.id,
      companyId: created.companyId,
      pillarId: created.pillarId,
      brandId: created.brandId,
      title: created.title,
      objective: created.objective,
      status: created.status,
      scheduledFor: created.scheduledFor,
      metadata: (created.metadata as Record<string, unknown>) ?? null,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    });
  }

  async update(contentPlan: ContentPlan): Promise<ContentPlan> {
    const updated = await this.prisma.contentPlan.update({
      where: { id: contentPlan.id },
      data: {
        title: contentPlan.title,
        objective: contentPlan.objective,
        status: contentPlan.status,
        scheduledFor: contentPlan.scheduledFor,
        metadata: contentPlan.metadata as any,
      },
    });

    return ContentPlan.fromPersistence({
      id: updated.id,
      companyId: updated.companyId,
      pillarId: updated.pillarId,
      brandId: updated.brandId,
      title: updated.title,
      objective: updated.objective,
      status: updated.status,
      scheduledFor: updated.scheduledFor,
      metadata: (updated.metadata as Record<string, unknown>) ?? null,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  }

  async findById(id: string): Promise<ContentPlan | null> {
    const item = await this.prisma.contentPlan.findUnique({ where: { id } });
    return item ? ContentPlan.fromPersistence({
      id: item.id,
      companyId: item.companyId,
      pillarId: item.pillarId,
      brandId: item.brandId,
      title: item.title,
      objective: item.objective,
      status: item.status,
      scheduledFor: item.scheduledFor,
      metadata: (item.metadata as Record<string, unknown>) ?? null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }) : null;
  }

  async findByCompany(companyId: string): Promise<ContentPlan[]> {
    const items = await this.prisma.contentPlan.findMany({ where: { companyId } });
    return items.map((item) => ContentPlan.fromPersistence({
      id: item.id,
      companyId: item.companyId,
      pillarId: item.pillarId,
      brandId: item.brandId,
      title: item.title,
      objective: item.objective,
      status: item.status,
      scheduledFor: item.scheduledFor,
      metadata: (item.metadata as Record<string, unknown>) ?? null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  }

  async findByCompanyAndStatus(companyId: string, status: string): Promise<ContentPlan[]> {
    const items = await this.prisma.contentPlan.findMany({ where: { companyId, status: status as any } });
    return items.map((item) => ContentPlan.fromPersistence({
      id: item.id,
      companyId: item.companyId,
      pillarId: item.pillarId,
      brandId: item.brandId,
      title: item.title,
      objective: item.objective,
      status: item.status,
      scheduledFor: item.scheduledFor,
      metadata: (item.metadata as Record<string, unknown>) ?? null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  }
}
