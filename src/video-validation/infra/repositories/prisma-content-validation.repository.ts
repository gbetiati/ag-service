import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { ContentValidation, ValidationResult } from '../../domain/content-validation.entity.js';
import { ContentValidationRepository } from '../../domain/content-validation.repository.interface.js';

@Injectable()
export class PrismaContentValidationRepository extends ContentValidationRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(validation: ContentValidation): Promise<ContentValidation> {
    const record = await this.prisma.contentValidation.create({
      data: {
        id: validation.id,
        companyId: validation.companyId,
        contentId: validation.contentId,
        videoAssetId: validation.videoAssetId,
        status: validation.status,
        validatorVersion: validation.validatorVersion,
        summary: validation.summary,
        failureReason: validation.failureReason,
        startedAt: validation.startedAt,
        completedAt: validation.completedAt,
        createdAt: validation.createdAt,
        updatedAt: validation.updatedAt,
      },
    });

    return this.mapEntity(record);
  }

  async update(validation: ContentValidation): Promise<ContentValidation> {
    const record = await this.prisma.contentValidation.update({
      where: { id: validation.id },
      data: {
        companyId: validation.companyId,
        contentId: validation.contentId,
        videoAssetId: validation.videoAssetId,
        status: validation.status,
        validatorVersion: validation.validatorVersion,
        summary: validation.summary,
        failureReason: validation.failureReason,
        startedAt: validation.startedAt,
        completedAt: validation.completedAt,
        updatedAt: validation.updatedAt,
      },
    });

    return this.mapEntity(record);
  }

  async findById(id: string): Promise<ContentValidation | null> {
    const record = await this.prisma.contentValidation.findUnique({ where: { id } });
    return record ? this.mapEntity(record) : null;
  }

  async findByContent(contentId: string): Promise<ContentValidation[]> {
    const records = await this.prisma.contentValidation.findMany({ where: { contentId } });
    return records.map((record) => this.mapEntity(record));
  }

  async findLatestByContent(contentId: string): Promise<ContentValidation | null> {
    const records = await this.prisma.contentValidation.findMany({
      where: { contentId },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    return records[0] ? this.mapEntity(records[0]) : null;
  }

  async createResult(result: ValidationResult): Promise<ValidationResult> {
    const record = await this.prisma.validationResult.create({
      data: {
        id: result.id,
        validationId: result.validationId,
        checkName: result.checkName,
        status: result.status,
        passed: result.passed,
        score: result.score,
        details: (result.details ?? undefined) as Prisma.InputJsonValue | undefined,
        evidence: (result.evidence ?? undefined) as Prisma.InputJsonValue | undefined,
        createdAt: result.createdAt,
      },
    });

    return this.mapResult(record);
  }

  async findResults(validationId: string): Promise<ValidationResult[]> {
    const records = await this.prisma.validationResult.findMany({
      where: { validationId },
      orderBy: { createdAt: 'asc' },
    });

    return records.map((record) => this.mapResult(record));
  }

  async deleteResults(validationId: string): Promise<void> {
    await this.prisma.validationResult.deleteMany({ where: { validationId } });
  }

  private mapEntity(record: {
    id: string;
    companyId: string;
    contentId: string;
    videoAssetId: string;
    status: string;
    validatorVersion: string;
    summary: string | null;
    failureReason: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): ContentValidation {
    return new ContentValidation(
      record.id,
      record.companyId,
      record.contentId,
      record.videoAssetId,
      record.status as any,
      record.validatorVersion,
      record.summary,
      record.failureReason,
      record.startedAt,
      record.completedAt,
      record.createdAt,
      record.updatedAt,
    );
  }

  private mapResult(record: {
    id: string;
    validationId: string;
    checkName: string;
    status: string;
    passed: boolean;
    score: number | null;
    details: Prisma.JsonValue | null;
    evidence: Prisma.JsonValue | null;
    createdAt: Date;
  }): ValidationResult {
    return new ValidationResult(
      record.id,
      record.validationId,
      record.checkName,
      record.status as any,
      record.passed,
      record.score,
      this.normalizeJson(record.details),
      this.normalizeJson(record.evidence),
      record.createdAt,
    );
  }

  private normalizeJson(value: Prisma.JsonValue | null): Record<string, unknown> | null {
    if (!value) {
      return null;
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return { value };
  }
}
