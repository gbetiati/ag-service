export type VisionAnalysisResult = {
  summary: string;
  source?: 'multimodal';
  issues: string[];
  confidence: number;
  detectedObjects: string[];
};

export abstract class VideoVisionService {
  abstract analyzeFrames(framePaths: string[]): Promise<VisionAnalysisResult>;
}
