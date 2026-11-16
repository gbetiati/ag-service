export abstract class FrameExtractionService {
  abstract extractRepresentativeFrames(videoPath: string, outputDir: string): Promise<string[]>;
}
