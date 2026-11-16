export type PolicyEvaluationResult = {
  passed: boolean;
  violations: string[];
  summary: string;
};

export abstract class ContentPolicyService {
  abstract evaluate(content: { title: string; brief?: string | null }, detectedText: string[], productNames: string[]): Promise<PolicyEvaluationResult>;
}
