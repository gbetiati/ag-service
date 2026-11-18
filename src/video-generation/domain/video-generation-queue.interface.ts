export type VideoGenerationJobData = {
  companyId: string;
  videoGenerationId: string;
  pollAttempt?: number;
};

export type VideoGenerationJobSummary = {
  jobId: string;
  videoGenerationId: string;
  state: string;
  failedReason: string | null;
  createdAt: number;
};

export abstract class VideoGenerationQueue {
  abstract enqueue(
    data: VideoGenerationJobData,
    options?: { delayMs?: number; pollAttempt?: number },
  ): Promise<{ jobId: string }>;
  abstract getCompanyJobs(companyId: string): Promise<VideoGenerationJobSummary[]>;
}
