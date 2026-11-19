import { Injectable } from '@nestjs/common';
import { ProductVerificationResult, ProductVerificationService } from '../../domain/product-verification.service.interface.js';

@Injectable()
export class ProductVerificationServiceImpl extends ProductVerificationService {
  async verifyProductMatch(
    content: { productId?: string | null; title: string; brief?: string | null },
    productNames: string[],
    detectedText: string[],
  ): Promise<ProductVerificationResult> {
    const normalizedProductNames = productNames.map((product) => product.toLowerCase());
    const normalizedDetectedText = detectedText.join(' ').toLowerCase();

    const matchedProducts = normalizedProductNames.filter((name) => normalizedDetectedText.includes(name));
    const missingProducts = normalizedProductNames.filter((name) => !normalizedDetectedText.includes(name));

    const passed = matchedProducts.length > 0 || (content.productId ? !!productNames.length : false);
    const summary = passed
      ? `Detected product references matching ${matchedProducts.length} catalog item(s).`
      : `No product references were detected in the extracted text for the requested content.`;

    return {
      passed,
      matchedProducts,
      missingProducts,
      summary,
    };
  }
}
