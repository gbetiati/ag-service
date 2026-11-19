import { Readable } from 'node:stream';

export type VideoGenerationStatus = 'QUEUED' | 'RENDERING' | 'READY' | 'FAILED';

export type VideoGenerationRequest = {
  companyId: string;
  contentId: string;
  title: string;
  script?: string | null;
  brandId?: string | null;
  productId?: string | null;
  sourceMediaAssetIds?: string[];
  sourceMediaUrls?: string[];
  outputFormat?: string;
  callbackReference?: string;
};

export type VideoGenerationResult = {
  renderJobId: string;
  status: VideoGenerationStatus;
  finalUrl?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
};

export class VideoRenderRequestError extends Error {
  constructor(message: string, readonly retryable = false) {
    super(message);
  }
}

export abstract class VideoProvider {
  abstract createRenderJob(
    request: VideoGenerationRequest,
  ): Promise<VideoGenerationResult>;
  abstract getRenderStatus(jobId: string, callbackRender?: boolean): Promise<VideoGenerationResult>;
  abstract fetchFinalVideo(jobId: string, callbackRender?: boolean): Promise<Readable>;
}
