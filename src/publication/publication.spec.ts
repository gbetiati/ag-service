import { describe, expect, it, vi } from 'vitest';
import { ApproveContentUseCase } from './application/approve-content.use-case.js';
import { CreateSocialAccountUseCase } from './application/create-social-account.use-case.js';
import { PublishContentUseCase } from './application/publish-content.use-case.js';
import { SocialAccount } from './domain/social-account.entity.js';
import { SocialCredential } from './domain/social-credential.entity.js';
import { Publication } from './domain/publication.entity.js';
import { Content } from '../content/domain/content.entity.js';

describe('publication module', () => {
  it('approves content when it belongs to the company', async () => {
    const content = Content.create({ companyId: 'company-1', title: 'Campaign', slug: 'campaign' });
    const contentRepository = {
      findById: vi.fn().mockResolvedValue(content),
      update: vi.fn(async (entity: Content) => entity),
    };

    const useCase = new ApproveContentUseCase(contentRepository as any);
    const result = await useCase.execute({ companyId: 'company-1', contentId: 'content-1' });

    expect(result.status).toBe('APPROVED');
    expect(contentRepository.update).toHaveBeenCalledTimes(1);
  });

  it('creates a social account and allows publishing only for a valid company handle', async () => {
    const account = SocialAccount.create({
      companyId: 'company-1',
      platform: 'INSTAGRAM',
      accountHandle: 'brandhandle',
      displayName: 'Brand Handle',
    });

    const accountRepository = {
      findByCompanyAndPlatform: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue(account),
      findById: vi.fn().mockResolvedValue(account),
      findByCompany: vi.fn().mockResolvedValue([account]),
      update: vi.fn(),
    };

    const useCase = new CreateSocialAccountUseCase(accountRepository as any);
    const result = await useCase.execute({
      companyId: 'company-1',
      platform: 'INSTAGRAM',
      accountHandle: 'brandhandle',
      displayName: 'Brand Handle',
    });

    expect(result.platform).toBe('INSTAGRAM');
    expect(accountRepository.create).toHaveBeenCalledTimes(1);
  });

  it('publishes only approved content to a connected social account', async () => {
    const content = Content.create({ companyId: 'company-1', title: 'Campaign', slug: 'campaign', status: 'APPROVED' });
    const account = SocialAccount.create({ companyId: 'company-1', platform: 'INSTAGRAM', accountHandle: 'brandhandle' });
    const credential = SocialCredential.create({
      companyId: 'company-1',
      socialAccountId: account.id,
      kind: 'ACCESS_TOKEN',
      encryptedValue: 'encrypted',
      initializationVector: 'iv',
    });

    const contentRepository = {
      findById: vi.fn().mockResolvedValue(content),
      update: vi.fn(async (entity: Content) => entity),
    };
    const socialAccountRepository = {
      findById: vi.fn().mockResolvedValue(account),
      findByCompany: vi.fn(),
      findByCompanyAndPlatform: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    };
    const credentialRepository = {
      findActiveBySocialAccount: vi.fn().mockResolvedValue(credential),
      create: vi.fn(),
      update: vi.fn(),
      findBySocialAccount: vi.fn(),
      findById: vi.fn(),
    };
    const publicationRepository = {
      findLatestByContentAndAccount: vi.fn().mockResolvedValue(null),
      create: vi.fn(async (publication: Publication) => publication),
      update: vi.fn(async (publication: Publication) => publication),
      findById: vi.fn(),
      findByCompany: vi.fn(),
      findByContent: vi.fn(),
    };
    const attemptsRepository = {
      create: vi.fn(),
      findByPublication: vi.fn(),
    };
    const gateService = {
      authorize: vi.fn().mockResolvedValue({ allowed: true, reasons: [] }),
    };
    const publisher = {
      publish: vi.fn().mockResolvedValue({ externalPostId: 'post-1', metadata: { platform: 'INSTAGRAM' } }),
    };

    const useCase = new PublishContentUseCase(
      contentRepository as any,
      socialAccountRepository as any,
      credentialRepository as any,
      publicationRepository as any,
      attemptsRepository as any,
      gateService as any,
      publisher as any,
    );

    const result = await useCase.execute({ companyId: 'company-1', contentId: 'content-1', socialAccountId: account.id });

    expect(result.status).toBe('PUBLISHED');
    expect(publisher.publish).toHaveBeenCalledTimes(1);
  });
});
