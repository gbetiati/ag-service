export type ProductVerificationResult = {
  passed: boolean;
  matchedProducts: string[];
  missingProducts: string[];
  summary: string;
};

export abstract class ProductVerificationService {
  abstract verifyProductMatch(content: { productId?: string | null; title: string; brief?: string | null }, productNames: string[], detectedText: string[]): Promise<ProductVerificationResult>;
}
