import { Injectable } from '@nestjs/common';
import { VideoGenerationQueue } from '../domain/video-generation-queue.interface.js';
import { VideoGenerationRepository } from '../domain/video-generation.repository.interface.js';

@Injectable()
export class GetVideoGenerationJobsUseCase {
  constructor(
    private readonly videoGenerationRepository: VideoGenerationRepository,
    private readonly videoGenerationQueue: VideoGenerationQueue,
  ) {}

  async execute(companyId: string) {
    const generations = await this.videoGenerationRepository.findByCompany(companyId);
    const jobs = await this.videoGenerationQueue.getCompanyJobs(companyId);
    const jobsByAsset = new Map<string, typeof jobs>();
    for (const job of jobs) {
      const assetJobs = jobsByAsset.get(job.videoGenerationId) ?? [];
      assetJobs.push(job);
      jobsByAsset.set(job.videoGenerationId, assetJobs);
    }

    return generations.map((generation) => ({
      videoGenerationId: generation.id,
      contentId: generation.contentId,
      status: generation.status,
      videoAssetId: generation.videoAssetId,
      errorMessage: generation.errorMessage,
      jobs: jobsByAsset.get(generation.id) ?? [],
    }));
  }
}
