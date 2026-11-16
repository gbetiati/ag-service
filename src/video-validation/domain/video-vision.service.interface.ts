export type VisionAnalysisResult = {
  summary: string;
  issues: string[];
  confidence: number;
  detectedObjects: string[];
};

export abstract class VideoVisionService {
  abstract analyzeFrames(framePaths: string[]): Promise<VisionAnalysisResult>;
}
