export type ProductSignal = {
  id: string;
  name: string;
};

export type GenerateIdeaDraft = {
  title: string;
  summary: string;
  targetAudience?: string | null;
  angle?: string | null;
};

export type PlannedCalendarSlot = {
  title: string;
  objective: string;
  scheduledFor: Date;
};

export abstract class ContentStrategyAiService {
  abstract generateIdeas(input: {
    companyId: string;
    brandId?: string | null;
    products?: ProductSignal[];
    pillarName?: string;
    focus?: string;
  }): Promise<GenerateIdeaDraft[]>;

  abstract buildCalendar(input: {
    companyId: string;
    brandId?: string | null;
    ideaTitles: string[];
    startDate: Date;
    days: number;
  }): Promise<PlannedCalendarSlot[]>;

  abstract compareSimilarity(input: { a: string; b: string }): Promise<{ score: number; isSimilar: boolean }>;
}
