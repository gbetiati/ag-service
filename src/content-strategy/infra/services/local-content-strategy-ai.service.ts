import { Injectable } from '@nestjs/common';
import { ContentStrategyAiService, GenerateIdeaDraft, PlannedCalendarSlot } from '../../domain/content-strategy-ai.service.interface.js';

@Injectable()
export class LocalContentStrategyAiService extends ContentStrategyAiService {
  async generateIdeas(input: {
    companyId: string;
    brandId?: string | null;
    products?: Array<{ id: string; name: string }>;
    pillarName?: string;
    focus?: string;
  }): Promise<GenerateIdeaDraft[]> {
    const products = input.products && input.products.length > 0 ? input.products : [{ id: 'default-product', name: 'featured product' }];
    const focus = input.focus ?? 'awareness and conversion';
    const pillar = input.pillarName ?? 'General strategy';

    return products.map((product, index) => ({
      title: `${product.name}: ${pillar} ${index + 1}`,
      summary: `Criar um roteiro com foco em ${focus}, destacando a proposta de valor e o uso do produto ${product.name}.`,
      targetAudience: 'Consumidores de conteúdo visual em redes sociais',
      angle: `Narrativa comercial e prática para ${product.name} no canal principal.`,
    }));
  }

  async buildCalendar(input: {
    companyId: string;
    brandId?: string | null;
    ideaTitles: string[];
    startDate: Date;
    days: number;
  }): Promise<PlannedCalendarSlot[]> {
    const ideaTitles = input.ideaTitles.length > 0 ? input.ideaTitles : ['Conteúdo principal'];
    const intervalMs = Math.max(24 * 60 * 60 * 1000, Math.floor(input.days / Math.max(1, ideaTitles.length)) * 24 * 60 * 60 * 1000);
    const start = new Date(input.startDate);

    return ideaTitles.map((title, index) => ({
      title: title.trim(),
      objective: `Planejamento de conteúdo para a campanha ${index + 1} com foco em alcance e conversão.`,
      scheduledFor: new Date(start.getTime() + intervalMs * index + 3 * 60 * 60 * 1000),
    }));
  }

  async compareSimilarity(input: { a: string; b: string }): Promise<{ score: number; isSimilar: boolean }> {
    const tokenize = (value: string) =>
      value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);

    const tokensA = tokenize(input.a);
    const tokensB = tokenize(input.b);
    const setA = new Set(tokensA);
    const setB = new Set(tokensB);
    const intersection = [...setA].filter((token) => setB.has(token)).length;
    const union = new Set([...setA, ...setB]).size;
    const score = union === 0 ? 0 : intersection / union;

    return {
      score: Number(score.toFixed(2)),
      isSimilar: score >= 0.35,
    };
  }
}
