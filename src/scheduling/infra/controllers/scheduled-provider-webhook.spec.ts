import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { ScheduledProviderWebhookController } from './scheduled-provider-webhook.controller.js';

describe('scheduled provider callbacks', () => {
  const key = Buffer.alloc(32, 3);
  const renderSecret = 'a-test-secret-with-at-least-32-characters';

  function fixture() {
    const schedules = { notifyScript: vi.fn(), notifyRender: vi.fn() };
    const config = new ConfigService({
      SCHEDULED_OPENAI_WEBHOOK_SECRET: `whsec_${key.toString('base64')}`,
      SCHEDULED_CREATOMATE_WEBHOOK_SECRET: renderSecret,
    });
    return { schedules, controller: new ScheduledProviderWebhookController(config, schedules as never) };
  }

  it('verifies the raw OpenAI payload and rejects a stale or modified delivery', async () => {
    const { schedules, controller } = fixture();
    const body = { type: 'response.completed', data: { id: 'resp_123' } };
    const rawBody = Buffer.from(JSON.stringify(body));
    const timestamp = String(Math.floor(Date.now() / 1000));
    const headers: Record<string, string> = {
      'webhook-id': 'msg_123', 'webhook-timestamp': timestamp,
      'webhook-signature': `v1,${createHmac('sha256', key).update(`msg_123.${timestamp}.`).update(rawBody).digest('base64')}`,
    };
    await controller.openai({ body, rawBody, get: (field: string) => headers[field] } as never);
    expect(schedules.notifyScript).toHaveBeenCalledWith('resp_123');
    await expect(controller.openai({ body, rawBody: Buffer.from('{}'), get: (field: string) => headers[field] } as never)).rejects.toThrow('signature');
    headers['webhook-timestamp'] = '1';
    await expect(controller.openai({ body, rawBody, get: (field: string) => headers[field] } as never)).rejects.toThrow('signature');
    expect(schedules.notifyScript).toHaveBeenCalledTimes(1);
  });

  it('authenticates Creatomate by generation and forwards only the render ID', async () => {
    const { schedules, controller } = fixture();
    const signature = createHmac('sha256', renderSecret).update('generation-1').digest('hex');
    const request = { body: { id: 'render-1', url: 'https://example.com/ignored.mp4' } } as never;
    await controller.creatomate('generation-1', signature, request);
    await expect(controller.creatomate('generation-2', signature, request)).rejects.toThrow('token');
    expect(schedules.notifyRender).toHaveBeenCalledExactlyOnceWith('generation-1', 'render-1');
  });
});
