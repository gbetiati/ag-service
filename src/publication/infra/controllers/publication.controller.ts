import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateSocialAccountUseCase } from '../../application/create-social-account.use-case.js';
import { CreateSocialCredentialUseCase } from '../../application/create-social-credential.use-case.js';
import { CreatePublicationUseCase } from '../../application/create-publication.use-case.js';
import { ApproveContentUseCase } from '../../application/approve-content.use-case.js';
import { RejectContentUseCase } from '../../application/reject-content.use-case.js';
import { QueueImmediatePublicationUseCase } from '../../application/queue-immediate-publication.use-case.js';
import { GetSocialAccountsUseCase } from '../../application/get-social-accounts.use-case.js';
import { CreateSocialAccountDto } from '../dto/create-social-account.dto.js';
import { CreateSocialCredentialDto } from '../dto/create-social-credential.dto.js';
import { CreatePublicationDto } from '../dto/create-publication.dto.js';
import { PublishContentDto } from '../dto/publish-content.dto.js';
import { Roles } from '../../../identity/infra/http/identity.decorators.js';

@Controller('companies/:companyId')
export class PublicationController {
  constructor(
    private readonly createSocialAccountUseCase: CreateSocialAccountUseCase,
    private readonly getSocialAccountsUseCase: GetSocialAccountsUseCase,
    private readonly createSocialCredentialUseCase: CreateSocialCredentialUseCase,
    private readonly createPublicationUseCase: CreatePublicationUseCase,
    private readonly approveContentUseCase: ApproveContentUseCase,
    private readonly rejectContentUseCase: RejectContentUseCase,
    private readonly queueImmediatePublicationUseCase: QueueImmediatePublicationUseCase,
  ) {}

  @Post('social-accounts')
  @Roles('OWNER', 'ADMIN')
  async createSocialAccount(@Param('companyId') companyId: string, @Body() body: CreateSocialAccountDto) {
    return this.createSocialAccountUseCase.execute({ companyId, ...body });
  }

  @Get('social-accounts')
  async getSocialAccounts(@Param('companyId') companyId: string) {
    return this.getSocialAccountsUseCase.execute(companyId);
  }

  @Post('social-accounts/:socialAccountId/credentials')
  @Roles('OWNER', 'ADMIN')
  async createSocialCredential(
    @Param('companyId') companyId: string,
    @Param('socialAccountId') socialAccountId: string,
    @Body() body: CreateSocialCredentialDto,
  ) {
    return this.createSocialCredentialUseCase.execute({ companyId, socialAccountId, ...body });
  }

  @Post('content/:contentId/publications')
  @Roles('OWNER', 'ADMIN')
  async createPublication(
    @Param('companyId') companyId: string,
    @Param('contentId') contentId: string,
    @Body() body: CreatePublicationDto,
  ) {
    return this.createPublicationUseCase.execute({
      companyId,
      contentId,
      socialAccountId: body.socialAccountId,
      provider: body.provider,
      scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : null,
    });
  }

  @Post('content/:contentId/approve')
  @Roles('OWNER', 'ADMIN')
  async approveContent(@Param('companyId') companyId: string, @Param('contentId') contentId: string) {
    return this.approveContentUseCase.execute({ companyId, contentId });
  }

  @Post('content/:contentId/reject')
  @Roles('OWNER', 'ADMIN')
  async rejectContent(
    @Param('companyId') companyId: string,
    @Param('contentId') contentId: string,
    @Body() body: { reason?: string },
  ) {
    return this.rejectContentUseCase.execute({ companyId, contentId, reason: body.reason });
  }

  @Post('content/:contentId/publish')
  @Roles('OWNER', 'ADMIN')
  async publishContent(
    @Param('companyId') companyId: string,
    @Param('contentId') contentId: string,
    @Body() body: PublishContentDto,
  ) {
    return this.queueImmediatePublicationUseCase.execute({ companyId, contentId, socialAccountId: body.socialAccountId });
  }
}
