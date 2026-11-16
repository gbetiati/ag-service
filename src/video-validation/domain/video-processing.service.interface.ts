export type VideoIntegrityReport = {
  isValid: boolean;
  reason?: string;
  technicalMetadata?: Record<string, unknown>;
  sizeBytes?: number;
};

export abstract class VideoProcessingService {
  abstract downloadVideo(storageKey: string): Promise<{ path: string; sizeBytes: number; mimeType?: string }>; 
  abstract validateVideoIntegrity(path: string): Promise<VideoIntegrityReport>;
  abstract collectTechnicalMetadata(path: string): Promise<Record<string, unknown>>;
}
