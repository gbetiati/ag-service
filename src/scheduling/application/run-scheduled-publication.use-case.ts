import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ContentStrategy } from '../../content-strategy/application/content-strategy.service.js';
import { ContentStrategyError } from '../../content-strategy/domain/scheduled-content-ai.interface.js';
import { PublishContentUseCase } from '../../publication/application/publish-content.use-case.js';
import { PublicationGateService } from '../../publication/domain/publication-gate.service.interface.js';
import { SchedulingQueueService } from '../domain/queue.service.interface.js';
import {
  ScheduleJob,
  ScheduledPublicationRepository,
  ScheduledRun,
  ScheduleStage,
  scheduledVideoPassed,
} from '../domain/scheduled-publication.repository.js';
import { ScheduledPublicationQueue } from './scheduled-publication-queue.service.js';

const POLL_MS = 10_000;
const MAX_STAGE_MS = 60 * 60_000;
const PUBLISH_RECONCILIATION_MS = 30 * 60_000;

@Injectable()
export class RunScheduledPublicationUseCase {
  private readonly logger = new Logger(RunScheduledPublicationUseCase.name);

  constructor(
    private readonly scheduledPublicationRepository: ScheduledPublicationRepository,
    private readonly contentStrategy: ContentStrategy,
    private readonly queues: SchedulingQueueService,
    private readonly scheduleQueue: ScheduledPublicationQueue,
    private readonly publicationGateService: PublicationGateService,
    private readonly publishContentUseCase: PublishContentUseCase,
  ) { }

  async execute(job: ScheduleJob): Promise<void> {
    const run = await this.scheduledPublicationRepository.claim(job, new Date());
    if (!run) return;

    if (run.published) {
      await this.move(run, 'PUBLISHED', null);
      return;
    }
    if (run.stage === 'PUBLISHING') {
      await this.move(
        run,
        'RECONCILIATION_REQUIRED',
        null,
        'Publication outcome is unknown. Verify the Instagram post before another attempt.',
      );
      return;
    }
    if (!run.validTarget || run.rejected) {
      await this.move(
        run,
        'FAILED',
        null,
        'The publication links are invalid or the content is no longer eligible.',
      );
      return;
    }

    const stageQueues: Partial<Record<ScheduleStage, string>> = {
      PREPARE: 'content-planning',
      RENDER: 'video-generation',
      // VALIDATE: 'video-validation',
    };

    if (!run.companyActive || run.pausedQueues.some((queue) =>
      queue === 'social-publishing' || queue === stageQueues[run.stage],
    )
    ) {
      await this.wait(
        run,
        'Waiting for company or queue automation to resume.',
        30_000,
      );
      return;
    }
    if (run.stage !== 'PREPARE' && !run.revisionMatches) {
      await this.move(
        run,
        'FAILED',
        null,
        'Content changed after preparation. Reschedule to generate and review a new video.',
      );
      return;
    }

    switch (run.stage) {
      case 'PREPARE':
        await this.prepare(run);
        break;
      case 'RENDER':
        await this.render(run);
        break;
      case 'VALIDATE':
        await this.validate(run);
        break;
      case 'APPROVAL':
      case 'PUBLISH':
        await this.publish(run);
        break;
    }
  }

  private async prepare(run: ScheduledRun): Promise<void> {
    if (run.attempts > 3) {
      await this.move(
        run,
        'FAILED',
        null,
        'Editorial preparation exhausted its attempts.',
      );
      return;
    }
    try {
      const context = await this.scheduledPublicationRepository.context(run);
      console.log('context LOG', context)
      if (!context) {
        await this.move(
          run,
          'FAILED',
          null,
          'The content or brand is no longer available for this company.',
        );
        return;
      }
      const idea = await this.contentStrategy.prepare(context.instructions);
        console.log('idea LOG', idea)

      await this.scheduledPublicationRepository.prepare(run, idea, context.revision);
    } catch (error) {
      if (error instanceof ContentStrategyError && error.retryable && run.attempts < 3) {
        await this.move(
          run,
          'PREPARE',
          new Date(Date.now() + 5_000 * 2 ** (run.attempts - 1)),
          error.message,
          run.attempts,
        );
        return;
      }
      await this.move(
        run,
        'FAILED',
        null,
        error instanceof ContentStrategyError || error instanceof ConflictException ?
          error.message : 'Unable to persist the editorial preparation.',
      );
    }
  }

  private async render(run: ScheduledRun): Promise<void> {
    const generation = run.generation;

    if (generation?.asset?.ready) {
      await this.move(run, 'VALIDATE', new Date());
      return;
    }
    
    if (!generation || ['FAILED', 'READY'].includes(generation.status) || Date.now() - generation.createdAt.getTime() > MAX_STAGE_MS) {
      const stage = generation?.error?.startsWith('Render submission outcome is unknown')
        ? 'RECONCILIATION_REQUIRED'
        : 'FAILED';
      await this.move(
        run,
        stage,
        null,
        generation?.error ??
        'Rendering failed, exceeded its one-hour limit, or has no ready asset.',
      );
      return;
    }

    await this.dispatchMedia(
      run,
      {
        queueName: 'video-generation',
        jobName: 'generate-video',
        data: { companyId: run.companyId, videoGenerationId: generation.id },
        jobId: `scheduled-render-${generation.id}`,
      },
      generation.error ?? 'Waiting for video generation.',
    );
  }

  private async validate(run: ScheduledRun): Promise<void> {
    const video = run.generation?.asset;
    if (!video?.ready) {
      await this.move(
        run,
        'FAILED',
        null,
        'The rendered video is no longer available.',
      );
      return;
    }
    // if (run.validation?.status === 'APPROVED') {
    // if (!scheduledVideoPassed(run)) {
    // const reason = !run.validation.hasRealVision
    // ? 'The current validator has no real multimodal evidence for this video.'
    // : 'The exact video is missing required validation evidence.';
    // await this.move(run, 'FAILED', null, reason);
    // return;
    // }
    if (!video.publishable) {
      await this.move(
        run,
        'FAILED',
        null,
        'The stored video has no public HTTPS URL for Instagram.',
      );
      return;
    }
    await this.move(run, 'APPROVAL', new Date());
    // return;
    // }
    // if (
    // ['REJECTED', 'INCONCLUSIVE'].includes(run.validation?.status ?? '') ||
    // (run.generation &&
    // Date.now() - run.generation.createdAt.getTime() > MAX_STAGE_MS * 2)
    // ) {
    // await this.move(
    // run,
    // 'FAILED',
    // null,
    // run.validation?.reason ??
    // 'Validation did not approve the scheduled video.',
    // );
    // return;
    // }
    // await this.dispatchMedia(
    // run,
    // {
    // queueName: 'video-validation',
    // jobName: 'validate-video',
    // data: {
    // companyId: run.companyId,
    // videoAssetId: video.id,
    // scheduleId: run.id,
    // },
    // jobId: `scheduled-validation-${video.id}`,
    // },
    // run.validation?.reason ?? 'Waiting for independent video validation.',
    // );
  }

  private async publish(run: ScheduledRun): Promise<void> {
    if (!scheduledVideoPassed(run) || !run.generation?.asset?.publishable) {
      await this.move(
        run,
        'VALIDATE',
        new Date(),
        'The exact video must pass validation before publication.',
      );
      return;
    }
    // if (run.approvalMode === 'MANUAL' && !run.approved) {
    // await this.wait(
    // run,
    // 'Waiting for manual approval of this scheduled revision.',
    // 30_000,
    // );
    // return;
    // }
    if (run.scheduledFor.getTime() > Date.now()) {
      await this.move(
        run,
        'PUBLISH',
        run.scheduledFor,
        'Waiting for the publication time.',
      );
      return;
    }
    const input = {
      companyId: run.companyId,
      contentId: run.contentId,
      socialAccountId: run.socialAccountId,
      scheduleId: run.id,
      videoAssetId: run.generation.asset.id,
    };
    const decision = await this.publicationGateService.authorize({
      ...input,
      checkSchedule: true,
    });
    if (!decision.allowed) {
      await this.move(
        run,
        'PUBLISH',
        new Date(Date.now() + 30_000),
        decision.reasons.join(' | '),
      );
      return;
    }
    if (run.stage === 'APPROVAL') {
      await this.move(run, 'PUBLISH', new Date());
      return;
    }
    // Persist the exclusive publishing intent before calling the provider.
    const claimed = await this.scheduledPublicationRepository.advance(run, {
      stage: 'PUBLISHING',
      due: new Date(Date.now() + PUBLISH_RECONCILIATION_MS),
    });
    if (!claimed) return;

    try {
      await this.publishContentUseCase.execute(input);
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException
      ) {
        await this.move(
          claimed,
          'PUBLISH',
          new Date(Date.now() + 30_000),
          error.message,
        );
        return;
      }
      const current = await this.scheduledPublicationRepository.find({
        id: run.id,
        companyId: run.companyId,
      });
      if (!current?.published) {
        await this.move(
          claimed,
          'RECONCILIATION_REQUIRED',
          null,
          'Instagram publication was interrupted. Reconcile the provider outcome before retrying.',
        );
        return;
      }
    }
    await this.move(claimed, 'PUBLISHED', null);
  }

  private async dispatchMedia(
    run: ScheduledRun,
    job: {
      queueName: 'video-generation' | 'video-validation';
      jobName: string;
      data: Record<string, unknown>;
      jobId: string;
    },
    pending: string,
  ): Promise<void> {
    try {
      const state = await this.queues.getJobState(job.queueName, job.jobId);
      if (state === 'failed') {
        await this.move(
          run,
          'FAILED',
          null,
          run.generation?.error ?? run.validation?.reason ?? pending,
        );
        return;
      }
      await this.queues.schedule({ ...job, attempts: 3, deduplicate: true });
      await this.wait(run, pending);
    } catch {
      await this.wait(
        run,
        'The media queue is unavailable; waiting for reconciliation.',
      );
    }
  }

  private async wait(
    run: ScheduledRun,
    reason: string,
    delay = POLL_MS,
  ): Promise<void> {
    await this.move(run, run.stage, new Date(Date.now() + delay), reason);
  }

  private async move(
    run: ScheduledRun,
    stage: ScheduleStage,
    due: Date | null,
    error?: string,
    attempts?: number,
  ): Promise<void> {
    const terminal = stage === 'FAILED' || stage === 'RECONCILIATION_REQUIRED';
    const updated = await this.scheduledPublicationRepository.advance(run, {
      stage,
      due,
      error: terminal && error ? `${run.stage}: ${error}` : error,
      attempts,
    });
    if (updated && terminal) {
      this.logger.error({
        scheduleId: run.id,
        publicationId: run.publicationId,
        stage: run.stage,
        status: stage,
        reason: error,
      });
    }
    if (updated) await this.scheduleQueue.enqueue(updated);
  }
}
