export const SCHEDULED_CONTENT_PILLAR = 'Conteúdo editorial agendado';

export type ScheduledContentContext = {
  content: { title: string; brief: string | null };
  brand: { name: string; rules: string[] } | null;
  themeAvailable: boolean;
  products: {
    id: string;
    name: string;
    description: string | null;
    priceCents: number | null;
  }[];
  history: { title: string; script: string | null }[];
};

export type ScheduledContentDraft = {
  title: string;
  summary: string;
  script: string;
  productId: string | null;
};

export class ContentStrategyError extends Error {
  constructor(
    message: string,
    readonly retryable = false,
  ) {
    super(message);
  }
}

export abstract class ScheduledContentAi {
  abstract generate(
    context: ScheduledContentContext,
  ): Promise<ScheduledContentDraft>;
}

export abstract class AsyncScheduledContentAi {
  abstract submit(context: ScheduledContentContext): Promise<string>;
  abstract result(responseId: string): Promise<ScheduledContentDraft | null>;
}

export class ScriptSubmissionUncertain extends Error {}
