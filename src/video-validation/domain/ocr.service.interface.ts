export type OcrResult = {
  detectedText: string[];
  confidence: number;
  source: 'tesseract' | 'unavailable';
};

export abstract class OcrService {
  abstract runOcr(framePaths: string[]): Promise<OcrResult>;
}
