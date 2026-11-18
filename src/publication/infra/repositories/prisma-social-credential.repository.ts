import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { SocialCredential } from '../../domain/social-credential.entity.js';
import { SocialCredentialRepository } from '../../domain/social-credential.repository.interface.js';

@Injectable()
export class PrismaSocialCredentialRepository extends SocialCredentialRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(credential: SocialCredential): Promise<SocialCredential> {
    const record = await this.prisma.socialCredential.create({
      data: {
        id: credential.id,
        companyId: credential.companyId,
        socialAccountId: credential.socialAccountId,
        kind: credential.kind,
        encryptedValue: credential.encryptedValue,
        initializationVector: credential.initializationVector,
        expiresAt: credential.expiresAt,
        scopes: (credential.scopes ?? undefined) as Prisma.InputJsonValue | undefined,
        createdAt: credential.createdAt,
        updatedAt: credential.updatedAt,
      },
    });

    return this.toEntity(record);
  }

  async update(credential: SocialCredential): Promise<SocialCredential> {
    const record = await this.prisma.socialCredential.update({
      where: { id: credential.id },
      data: {
        companyId: credential.companyId,
        socialAccountId: credential.socialAccountId,
        kind: credential.kind,
        encryptedValue: credential.encryptedValue,
        initializationVector: credential.initializationVector,
        expiresAt: credential.expiresAt,
        scopes: (credential.scopes ?? undefined) as Prisma.InputJsonValue | undefined,
        updatedAt: credential.updatedAt,
      },
    });

    return this.toEntity(record);
  }

  async findById(id: string): Promise<SocialCredential | null> {
    const record = await this.prisma.socialCredential.findUnique({ where: { id } });
    return record ? this.toEntity(record) : null;
  }

  async findBySocialAccount(socialAccountId: string): Promise<SocialCredential[]> {
    const records = await this.prisma.socialCredential.findMany({ where: { socialAccountId } });
    return records.map((record) => this.toEntity(record));
  }

  async findActiveBySocialAccount(socialAccountId: string): Promise<SocialCredential | null> {
    const now = new Date();
    const records = await this.prisma.socialCredential.findMany({
      where: {
        socialAccountId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    return records[0] ? this.toEntity(records[0]) : null;
  }

  private toEntity(record: {
    id: string;
    companyId: string;
    socialAccountId: string;
    kind: string;
    encryptedValue: string;
    initializationVector: string;
    expiresAt: Date | null;
    scopes: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
  }): SocialCredential {
    return new SocialCredential(
      record.id,
      record.companyId,
      record.socialAccountId,
      record.kind as any,
      record.encryptedValue,
      record.initializationVector,
      record.expiresAt,
      record.scopes && typeof record.scopes === 'object' && !Array.isArray(record.scopes)
        ? (record.scopes as Record<string, unknown>)
        : record.scopes !== null
          ? ({ value: record.scopes } as Record<string, unknown>)
          : null,
      record.createdAt,
      record.updatedAt,
    );
  }
}
