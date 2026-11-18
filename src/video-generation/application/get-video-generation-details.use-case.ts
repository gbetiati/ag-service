import { Injectable, NotFoundException } from '@nestjs/common';
import { VideoGenerationRepository } from '../domain/video-generation.repository.interface.js';

@Injectable()
export class GetVideoGenerationDetailsUseCase {
  constructor(private readonly videoGenerationRepository: VideoGenerationRepository) {}

  async execute(input: { companyId: string; contentId: string; videoGenerationId: string }) {
    const generation = await this.videoGenerationRepository.findById(input.videoGenerationId);
    if (
      !generation ||
      generation.companyId !== input.companyId ||
      generation.contentId !== input.contentId
    ) {
      throw new NotFoundException('Video generation not found in company');
    }
    return generation;
  }
}
