import { VideoGeneration } from './video-generation.entity.js';

export abstract class VideoGenerationRepository {
  abstract create(generation: VideoGeneration): Promise<VideoGeneration>;
  abstract isScheduledRenderAllowed(id: string, companyId: string): Promise<boolean>;
  abstract claimScheduledSubmission(id: string, companyId: string): Promise<boolean>;
  abstract update(generation: VideoGeneration): Promise<VideoGeneration>;
  abstract findById(id: string): Promise<VideoGeneration | null>;
  abstract findByCompany(companyId: string): Promise<VideoGeneration[]>;
}
