import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { ScheduledPublicationRepository } from '../../../scheduling/domain/scheduled-publication.repository.js';
import { VideoAssetRepository } from '../../../video-generation/domain/video-asset.repository.interface.js';
import { ApplyValidationApprovalUseCase } from '../../application/apply-validation-approval.use-case.js';
import { ValidateVideoUseCase } from '../../application/validate-video.use-case.js';

type VideoValidationJobData = {
  videoAssetId: string;
  companyId?: string;
  scheduleId?: string;
};

@Injectable()
export class VideoValidationProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VideoValidationProcessor.name);
  private worker: Worker<VideoValidationJobData> | undefined;

  constructor(
    private readonly videoAssetRepository: VideoAssetRepository,
    private readonly validateVideo: ValidateVideoUseCase,
    private readonly applyValidationApproval: ApplyValidationApprovalUseCase,
    private readonly schedules: ScheduledPublicationRepository,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker<VideoValidationJobData>(
      'video-validation',
      (job) => this.processJob(job),
      {
        connection: {
          host: process.env.REDIS_HOST ?? 'localhost',
          port: Number(process.env.REDIS_PORT ?? 6379),
          username: process.env.REDIS_USERNAME ?? undefined,
          password: process.env.REDIS_PASSWORD ?? undefined,
        },
        concurrency: Number(process.env.VIDEO_VALIDATION_CONCURRENCY ?? 1),
      },
    );
    this.worker.on('error', (error) => this.logger.error('Video validation worker error', error.stack));
    this.worker.on('failed', (job, error) => {
      this.logger.error(`Video validation job ${job?.id ?? 'unknown'} failed`, error.stack);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }

  private async processJob(job: Job<VideoValidationJobData>): Promise<void> {
    const asset = await this.videoAssetRepository.findById(job.data.videoAssetId);
    if (!asset || asset.status !== 'READY' || !asset.storageKey) {
      throw new Error('Validation requires a persisted, ready video asset.');
    }

    if (job.data.scheduleId) {
      if (job.data.companyId !== asset.companyId) throw new Error('Scheduled validation company does not match the video asset.');
      const schedule = await this.schedules.find({ id: job.data.scheduleId, companyId: asset.companyId });
      if (!schedule || !schedule.validTarget || !schedule.revisionMatches || schedule.stage !== 'VALIDATE'
        || schedule.contentId !== asset.contentId || schedule.generation?.asset?.id !== asset.id
        || !schedule.companyActive || schedule.pausedQueues.some((queue) => queue === 'video-validation' || queue === 'social-publishing')
        || ['APPROVED', 'INCONCLUSIVE', 'REJECTED'].includes(schedule.validation?.status ?? '')) return;
    }

    const validation = await this.validateVideo.execute({
      companyId: asset.companyId,
      contentId: asset.contentId,
      videoAssetId: asset.id,
      ...(job.data.scheduleId ? { requireRealEvidence: true } : {}),
    });
    console.log('VALIDATION', validation, 'ASSET', asset)
    if (job.data.scheduleId) return;
    await this.applyValidationApproval.execute({
      companyId: asset.companyId,
      contentId: asset.contentId,
      validationStatus: validation.status,
    });
  }
}
