import { Injectable } from '@nestjs/common';
import { ContentStrategyError, ScheduledContentAi, ScheduledContentContext, ScheduledContentDraft, } from '../domain/scheduled-content-ai.interface.js';

@Injectable()
export class ContentStrategy {
  constructor(private readonly ai: ScheduledContentAi) { }

  requireMedia(context: ScheduledContentContext): void {
    if (!context.themeAvailable && !context.products.length) {
      throw new ContentStrategyError('No eligible product images or theme imagery are available for this content.');
    }
  }

  validateDraft(context: ScheduledContentContext, draft: ScheduledContentDraft): void {
    if (draft.productId && !context.products.some((product) => product.id === draft.productId)) {
      throw new ContentStrategyError('The AI selected a product outside the eligible catalog.');
    }
    if (draft.productId === null && !context.themeAvailable) {
      throw new ContentStrategyError('The AI selected a theme without an attached generic image.');
    }
  }

  async prepare(context: ScheduledContentContext): Promise<ScheduledContentDraft> {
    if (!context.themeAvailable && !context.products.length) {
      throw new ContentStrategyError('No eligible product images or theme imagery are available for this content.');
    }

    const draft = await this.ai.generate(context);

    if (draft.productId && !context.products.some((product) => product.id === draft.productId)) {
      throw new ContentStrategyError('The AI selected a product outside the eligible catalog.', true);
    }

    if (draft.productId === null && !context.themeAvailable) {
      throw new ContentStrategyError('The AI selected a theme without an attached generic image.', true);
    }
    // return draft;
    //simula draft ia

    return {
      title: "meu titulo",
      summary: "resumo!",
      script: "um anuncio vendendo um brownie delicioso",
      productId: "47a93324-d2b3-4006-8664-b51ae93b2722",
    }
  }
}
