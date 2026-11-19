import { BadRequestException, Controller, HttpCode, Param, Post, type RawBodyRequest, Req, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { Public } from '../../../identity/infra/http/identity.decorators.js';
import { ScheduledPublicationRepository } from '../../domain/scheduled-publication.repository.js';

@Controller('webhooks/scheduling')
@Public()
export class ScheduledProviderWebhookController {
  constructor(private readonly config: ConfigService, private readonly schedules: ScheduledPublicationRepository) {}

  @Post('openai')
  @HttpCode(204)
  async openai(@Req() request: RawBodyRequest<Request>): Promise<void> {
    const secret = this.config.get<string>('SCHEDULED_OPENAI_WEBHOOK_SECRET');
    const id = request.get('webhook-id');
    const timestamp = request.get('webhook-timestamp');
    const signature = request.get('webhook-signature');
    if (!secret || !id || !timestamp || !signature || !request.rawBody || !/^\d+$/.test(timestamp)
      || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) throw new UnauthorizedException('Invalid OpenAI webhook signature.');

    const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
    const expected = createHmac('sha256', key).update(`${id}.${timestamp}.`).update(request.rawBody).digest();
    if (!signature.split(/\s+/).some((value) => value.startsWith('v1,') && matches(expected, Buffer.from(value.slice(3), 'base64')))) {
      throw new UnauthorizedException('Invalid OpenAI webhook signature.');
    }

    const event = request.body as { type?: string; data?: { id?: string } } | undefined;
    if (event?.type && ['response.completed', 'response.failed', 'response.incomplete', 'response.cancelled'].includes(event.type)
      && typeof event.data?.id === 'string') await this.schedules.notifyScript(event.data.id);
  }

  @Post('creatomate/:generationId/:signature')
  @HttpCode(204)
  async creatomate(@Param('generationId') generationId: string, @Param('signature') signature: string, @Req() request: Request): Promise<void> {
    const secret = this.config.get<string>('SCHEDULED_CREATOMATE_WEBHOOK_SECRET');
    if (!secret || secret.length < 32 || !matches(createHmac('sha256', secret).update(generationId).digest(), Buffer.from(signature, 'hex'))) {
      throw new UnauthorizedException('Invalid Creatomate callback token.');
    }
    const renderId = (request.body as { id?: unknown } | undefined)?.id;
    if (typeof renderId !== 'string' || !renderId) throw new BadRequestException('Missing Creatomate render ID.');
    await this.schedules.notifyRender(generationId, renderId);
  }
}

function matches(expected: Buffer, supplied: Buffer): boolean {
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
