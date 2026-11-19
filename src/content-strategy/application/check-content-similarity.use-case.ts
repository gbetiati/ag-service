import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentIdeaRepository } from '../domain/content-idea.repository.interface.js';
import { ContentStrategyAiService } from '../domain/content-strategy-ai.service.interface.js';

export type CheckContentSimilarityInput = {
  companyId: string;
  firstIdeaId: string;
  secondIdeaId: string;
};

@Injectable()
export class CheckContentSimilarityUseCase {
  constructor(
    private readonly contentIdeaRepository: ContentIdeaRepository,
    private readonly contentStrategyAiService: ContentStrategyAiService,
  ) {}

  async execute(input: CheckContentSimilarityInput) {
    const firstIdea = await this.contentIdeaRepository.findById(input.firstIdeaId);
    if (!firstIdea || firstIdea.companyId !== input.companyId) {
      throw new NotFoundException('First idea not found for this company');
    }

    const secondIdea = await this.contentIdeaRepository.findById(input.secondIdeaId);
    if (!secondIdea || secondIdea.companyId !== input.companyId) {
      throw new NotFoundException('Second idea not found for this company');
    }

    const result = await this.contentStrategyAiService.compareSimilarity({
      a: `${firstIdea.title} ${firstIdea.summary}`,
      b: `${secondIdea.title} ${secondIdea.summary}`,
    });

    return {
      firstIdeaId: firstIdea.id,
      secondIdeaId: secondIdea.id,
      score: result.score,
      isSimilar: result.isSimilar,
    };
  }
}
