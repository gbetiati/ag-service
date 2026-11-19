import type { AudioTranscript } from './audio-transcription.service.interface.js';

import { ValidationStatus } from './validation-status.type.js';

export type ValidationAggregateInput = {
  integrity: { isValid: boolean; reason?: string; technicalMetadata?: Record<string, unknown> };
  ocr: { detectedText: string[]; confidence: number; source: 'tesseract' | 'unavailable' };
  vision: { summary: string; issues: string[]; confidence: number; detectedObjects: string[] };
  transcript: AudioTranscript;
  productVerification: { passed: boolean; matchedProducts: string[]; missingProducts: string[]; summary: string };
  policy: { passed: boolean; violations: string[]; summary: string };
};

export type ValidationAggregateResult = {
  status: ValidationStatus;
  summary: string;
  failureReason?: string;
  isApproved: boolean;
};

export abstract class ValidationAggregatorService {
  abstract aggregate(input: ValidationAggregateInput): Promise<ValidationAggregateResult>;
}
