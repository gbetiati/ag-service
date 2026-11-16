import { Injectable } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { OcrResult, OcrService } from '../../domain/ocr.service.interface.js';

const execFileAsync = promisify(execFile);

@Injectable()
export class TesseractOcrService extends OcrService {
  async runOcr(framePaths: string[]): Promise<OcrResult> {
    if (framePaths.length === 0) {
      return { detectedText: [], confidence: 0, source: 'unavailable' };
    }

    const detectedText: string[] = [];
    let confidenceTotal = 0;
    let successCount = 0;

    for (const framePath of framePaths) {
      try {
        const { stdout } = await execFileAsync('tesseract', [framePath, 'stdout', '--psm', '6'], { maxBuffer: 1024 * 1024 });
        const text = stdout.trim();
        if (text) {
          detectedText.push(text);
          const match = stdout.match(/\d+\.?\d*%/g);
          const currentConfidence = match && match.length > 0 ? Number.parseFloat(match[match.length - 1].replace('%', '')) / 100 : 0.5;
          confidenceTotal += currentConfidence;
          successCount += 1;
        }
      } catch {
        // ignore frames that cannot be OCR-processed in the current environment
      }
    }

    if (successCount === 0) {
      return { detectedText: [], confidence: 0, source: 'unavailable' };
    }

    const normalizedText = detectedText
      .flatMap((value) => value.split(/\s*\n\s*/))
      .map((value) => value.trim())
      .filter(Boolean);

    return {
      detectedText: normalizedText,
      confidence: Number((confidenceTotal / successCount).toFixed(2)),
      source: 'tesseract',
    };
  }
}
