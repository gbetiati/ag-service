import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { SocialAccount } from '../../domain/social-account.entity.js';
import { SocialAccountRepository } from '../../domain/social-account.repository.interface.js';

@Injectable()
export class PrismaSocialAccountRepository extends SocialAccountRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(account: SocialAccount): Promise<SocialAccount> {
    const record = await this.prisma.socialAccount.create({
      data: {
        id: account.id,
        companyId: account.companyId,
        platform: account.platform,
        accountHandle: account.accountHandle,
        displayName: account.displayName,
        status: account.status,
        metadata: (account.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      },
    });

    return this.toEntity(record);
  }

  async update(account: SocialAccount): Promise<SocialAccount> {
    const record = await this.prisma.socialAccount.update({
      where: { id: account.id },
      data: {
        companyId: account.companyId,
        platform: account.platform,
        accountHandle: account.accountHandle,
        displayName: account.displayName,
        status: account.status,
        metadata: (account.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        updatedAt: account.updatedAt,
      },
    });

    return this.toEntity(record);
  }

  async findById(id: string): Promise<SocialAccount | null> {
    const record = await this.prisma.socialAccount.findUnique({ where: { id } });
    return record ? this.toEntity(record) : null;
  }

  async findByCompany(companyId: string): Promise<SocialAccount[]> {
    const records = await this.prisma.socialAccount.findMany({ where: { companyId } });
    return records.map((record) => this.toEntity(record));
  }

  async findByCompanyAndPlatform(companyId: string, platform: string): Promise<SocialAccount[]> {
    const records = await this.prisma.socialAccount.findMany({ where: { companyId, platform: platform as any } });
    return records.map((record) => this.toEntity(record));
  }

  private toEntity(record: {
    id: string;
    companyId: string;
    platform: string;
    accountHandle: string;
    displayName: string | null;
    status: string;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
  }): SocialAccount {
    return new SocialAccount(
      record.id,
      record.companyId,
      record.platform as any,
      record.accountHandle,
      record.displayName,
      record.status as any,
      record.metadata && typeof record.metadata === 'object' && !Array.isArray(record.metadata)
        ? (record.metadata as Record<string, unknown>)
        : record.metadata !== null
          ? ({ value: record.metadata } as Record<string, unknown>)
          : null,
      record.createdAt,
      record.updatedAt,
    );
  }
}
