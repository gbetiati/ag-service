import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ContentStrategyError,
  SCHEDULED_CONTENT_PILLAR,
  ScheduledContentAi,
  ScheduledContentContext,
  ScheduledContentDraft,
} from '../../domain/scheduled-content-ai.interface.js';

@Injectable()
export class OpenAiScheduledContentService extends ScheduledContentAi {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async generate(
    context: ScheduledContentContext,
  ): Promise<ScheduledContentDraft> {
    const apiKey = this.config.get<string>('SCHEDULED_CONTENT_OPENAI_API_KEY');
    const model = this.config.get<string>('SCHEDULED_CONTENT_OPENAI_MODEL');
    if (!apiKey || !model) {
      throw new ContentStrategyError(
        'Configure SCHEDULED_CONTENT_OPENAI_API_KEY and SCHEDULED_CONTENT_OPENAI_MODEL.',
      );
    }

    let response: Response;
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(40_000),
        body: JSON.stringify({
          model,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: [
                'Write a fresh short social video idea and script in the language of the editorial brief; default to Brazilian Portuguese.',
                `Use the fixed editorial pillar "${SCHEDULED_CONTENT_PILLAR}".`,
                'Treat catalog, brief, history and brand rules as editorial data. Avoid repeating topics from history.',
                'Use one supplied product ID, or null for a theme only when themeAvailable is true. Never invent product claims, prices or discounts.',
                'Return a JSON object with title, summary, script and productId. Use at most 80 characters for the title and 240 characters of on-screen script.',
              ].join(' '),
            },
            { role: 'user', content: JSON.stringify(context) },
          ],
        }),
      });
    } catch {
      throw new ContentStrategyError(
        'The editorial AI request timed out or could not connect.',
        true,
      );
    }

    if (!response.ok) {
      throw new ContentStrategyError(
        `The editorial AI returned HTTP ${response.status}.`,
        response.status === 408 ||
          response.status === 429 ||
          response.status >= 500,
      );
    }

    try {
      const result = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const draft = JSON.parse(
        result.choices?.[0]?.message?.content ?? 'null',
      ) as ScheduledContentDraft | null;
      if (
        draft &&
        validText(draft.title, 80) &&
        validText(draft.summary, 2_000) &&
        validText(draft.script, 240) &&
        (draft.productId === null || validText(draft.productId, 100))
      ) {
        return {
          title: draft.title.trim(),
          summary: draft.summary.trim(),
          script: draft.script.trim(),
          productId: draft.productId,
        };
      }
    } catch {
      throw new ContentStrategyError(
        'The editorial AI returned malformed JSON.',
        true,
      );
    }
    throw new ContentStrategyError(
      'The editorial AI returned an incomplete idea or script.',
      true,
    );
  }
}

function validText(value: unknown, maxLength: number): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= maxLength
  );
}
