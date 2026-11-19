import { Injectable } from '@nestjs/common';
import { ContentPolicyService, PolicyEvaluationResult } from '../../domain/content-policy.service.interface.js';

@Injectable()
export class ContentPolicyServiceImpl extends ContentPolicyService {
  async evaluate(
    content: { title: string; brief?: string | null },
    detectedText: string[],
    productNames: string[],
  ): Promise<PolicyEvaluationResult> {
    const combinedText = `${content.title} ${content.brief ?? ''} ${detectedText.join(' ')}`.toLowerCase();
    const violations: string[] = [];

    const bannedTerms = ['illegal', 'spam', 'fraud', 'misleading', 'banned'];
    for (const term of bannedTerms) {
      if (combinedText.includes(term)) {
        violations.push(term);
      }
    }

    if (productNames.length === 0 && !combinedText.trim()) {
      violations.push('no-product-catalog');
    }

    return {
      passed: violations.length === 0,
      violations,
      summary: violations.length === 0
        ? 'No commercial policy violations were detected for this content.'
        : `Policy checks failed due to: ${violations.join(', ')}`,
    };
  }
}
