import { Injectable } from '@nestjs/common';
import { ValidationAggregatorService, ValidationAggregateInput, ValidationAggregateResult } from '../../domain/validation-aggregator.service.interface.js';

@Injectable()
export class ValidationAggregatorServiceImpl extends ValidationAggregatorService {
  async aggregate(input: ValidationAggregateInput): Promise<ValidationAggregateResult> {
    const failures: string[] = [];

    if (!input.integrity.isValid) {
      failures.push(input.integrity.reason ?? 'The video file failed integrity checks.');
    }

    if (!input.productVerification.passed) {
      failures.push('Product verification did not match the catalog content.');
    }

    if (!input.policy.passed) {
      failures.push(input.policy.summary);
    }

    if (input.ocr.detectedText.length === 0 && input.ocr.source === 'unavailable') {
      failures.push('OCR could not extract any text from the video frames.');
    }

    if (failsValidationReason(input)) {
      return {
        status: 'REJECTED',
        summary: 'Validation failed because one or more required checks did not pass.',
        failureReason: failures.join('; '),
        isApproved: false,
      };
    }

    return {
      status: 'APPROVED',
      summary: 'All required validation checks passed successfully.',
      isApproved: true,
    };
  }
}

function failsValidationReason(input: ValidationAggregateInput): boolean {
  return !input.integrity.isValid
    || !input.productVerification.passed
    || !input.policy.passed
    || (input.ocr.detectedText.length === 0 && input.ocr.source === 'unavailable');
}
