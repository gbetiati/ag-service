import { VideoGeneration } from './video-generation.entity.js';

export abstract class VideoGenerationRepository {
  abstract create(generation: VideoGeneration): Promise<VideoGeneration>;
  abstract update(generation: VideoGeneration): Promise<VideoGeneration>;
  abstract findById(id: string): Promise<VideoGeneration | null>;
  abstract findByCompany(companyId: string): Promise<VideoGeneration[]>;
}
