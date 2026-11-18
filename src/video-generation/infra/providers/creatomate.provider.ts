import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VideoGenerationRequest, VideoGenerationResult, VideoProvider } from '../../domain/video-provider.interface.js';

@Injectable()
export class CreatomateProvider extends VideoProvider {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async createRenderJob(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    const apiKey = this.configService.get<string>('CREATOMATE_API_KEY');
    if (!apiKey) {
      throw new Error('CREATOMATE_API_KEY is not configured. Configure the video render provider before generating a video.');
    }

    return {
      renderJobId: `creatomate-${Date.now()}`,
      status: 'QUEUED',
      metadata: {
        provider: 'creatomate',
        companyId: request.companyId,
        contentId: request.contentId,
        title: request.title,
      },
    };
  }

  async getRenderStatus(jobId: string): Promise<VideoGenerationResult> {
    const apiKey = this.configService.get<string>('CREATOMATE_API_KEY');
    if (!apiKey) {
      throw new Error('CREATOMATE_API_KEY is not configured. Configure the video render provider before checking the render status.');
    }

    return {
      renderJobId: jobId,
      status: 'READY',
      finalUrl: `https://example.invalid/videos/${jobId}.mp4`,
      metadata: {
        provider: 'creatomate',
        jobId,
      },
    };
  }

  async fetchFinalVideo(jobId: string): Promise<Buffer> {
    const apiKey = this.configService.get<string>('CREATOMATE_API_KEY');
    if (!apiKey) {
      throw new Error('CREATOMATE_API_KEY is not configured. Configure the video render provider before downloading the final video.');
    }

    return Buffer.from(`mock-video:${jobId}`, 'utf8');
  }
}
