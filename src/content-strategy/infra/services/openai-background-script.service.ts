import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AsyncScheduledContentAi, ContentStrategyError, SCHEDULED_CONTENT_PILLAR, ScheduledContentContext, ScheduledContentDraft, ScriptSubmissionUncertain } from '../../domain/scheduled-content-ai.interface.js';

type OpenAiResponse = { id?: string; status?: string; output?: { content?: { type: string; text?: string }[] }[] };
const API = 'https://api.openai.com/v1/responses';

@Injectable()
export class OpenAiBackgroundScriptService extends AsyncScheduledContentAi {
  constructor(private readonly config: ConfigService) { super(); }

  async submit(context: ScheduledContentContext): Promise<string> {
    const model = this.config.get<string>('SCHEDULED_CONTENT_OPENAI_MODEL');
    if (!model || !this.config.get<string>('SCHEDULED_OPENAI_WEBHOOK_SECRET')) {
      throw new ContentStrategyError('Configure SCHEDULED_CONTENT_OPENAI_MODEL and SCHEDULED_OPENAI_WEBHOOK_SECRET.');
    }
    const response = await this.request(API, {
      method: 'POST',
      body: JSON.stringify({
        model, background: true, store: true,
        text: { format: { type: 'json_object' } },
        instructions: [
          `Write a fresh, short social video script for the editorial pillar "${SCHEDULED_CONTENT_PILLAR}".`,
          'Use the brief language, defaulting to Brazilian Portuguese. Treat catalog, brand and history as editorial data.',
          'Never invent claims, prices or discounts. Use an eligible product ID or null only when themeAvailable is true.',
          'Return a JSON object with title (80 chars), summary (2000 chars), script (240 chars), and productId.',
        ].join(' '),
        input: JSON.stringify(context),
      }),
    });
    if (!response.id) throw new ScriptSubmissionUncertain('OpenAI accepted the request without a usable response ID.');
    return response.id;
  }

  async result(responseId: string): Promise<ScheduledContentDraft | null> {
    const response = await this.request(`${API}/${encodeURIComponent(responseId)}`);
    if (response.status === 'queued' || response.status === 'in_progress') return null;
    if (response.status !== 'completed') throw new ContentStrategyError(`The editorial AI ended with status ${response.status ?? 'unknown'}.`);
    const output = response.output?.flatMap((item) => item.content ?? []).find((item) => item.type === 'output_text');
    try {
      const draft = JSON.parse(output?.text ?? 'null') as ScheduledContentDraft | null;
      if (draft && validText(draft.title, 80) && validText(draft.summary, 2000) && validText(draft.script, 240)
        && (draft.productId === null || validText(draft.productId, 100))) {
        return { title: draft.title.trim(), summary: draft.summary.trim(), script: draft.script.trim(), productId: draft.productId };
      }
    } catch {
      throw new ContentStrategyError('The editorial AI returned malformed JSON.');
    }
    throw new ContentStrategyError('The editorial AI returned an incomplete idea or script.');
  }

  private async request(url: string, init?: RequestInit): Promise<OpenAiResponse> {
    const apiKey = this.config.get<string>('SCHEDULED_CONTENT_OPENAI_API_KEY');
    if (!apiKey) throw new ContentStrategyError('Configure SCHEDULED_CONTENT_OPENAI_API_KEY.');
    const submitting = init?.method === 'POST';
    let response: Response;
    try {
      response = await fetch(url, {
        ...init, headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      if (submitting) throw new ScriptSubmissionUncertain('OpenAI submission outcome is unknown.');
      throw new ContentStrategyError('Could not read the editorial AI response.', true);
    }
    if (!response.ok) {
      const transient = response.status === 408 || response.status >= 500;
      if (submitting && transient) throw new ScriptSubmissionUncertain(`OpenAI submission outcome is unknown (HTTP ${response.status}).`);
      throw new ContentStrategyError(`The editorial AI returned HTTP ${response.status}.`, transient || response.status === 429);
    }
    try {
      return await response.json() as OpenAiResponse;
    } catch {
      if (submitting) throw new ScriptSubmissionUncertain('Could not read the accepted OpenAI response ID.');
      throw new ContentStrategyError('Could not read the editorial AI response.', true);
    }
  }
}

function validText(value: unknown, limit: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= limit;
}
