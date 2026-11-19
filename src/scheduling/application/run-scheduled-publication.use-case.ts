import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ContentStrategy } from '../../content-strategy/application/content-strategy.service.js';
import { AsyncScheduledContentAi, ContentStrategyError, ScriptSubmissionUncertain } from '../../content-strategy/domain/scheduled-content-ai.interface.js';
import { PublishContentUseCase } from '../../publication/application/publish-content.use-case.js';
import { PublicationGateService } from '../../publication/domain/publication-gate.service.interface.js';
import { ProcessVideoGenerationUseCase } from '../../video-generation/application/process-video-generation.use-case.js';
import { VideoRenderRequestError } from '../../video-generation/domain/video-provider.interface.js';
import {
  ScheduleJob,
  ScheduledPublicationRepository,
  ScheduledRun,
  ScheduleStage,
  scheduledVideoPassed,
} from '../domain/scheduled-publication.repository.js';

const CALLBACK_RECOVERY_MS = 90_000;
const MAX_STAGE_MS = 60 * 60_000;
const PUBLISH_RECONCILIATION_MS = 30 * 60_000;

@Injectable()
export class RunScheduledPublicationUseCase {
  private readonly logger = new Logger(RunScheduledPublicationUseCase.name);

  constructor(
    private readonly scheduledPublicationRepository: ScheduledPublicationRepository,
    private readonly contentStrategy: ContentStrategy,
    private readonly scriptProvider: AsyncScheduledContentAi,
    private readonly videoGeneration: ProcessVideoGenerationUseCase,
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
    if (run.scriptRevision && !run.scriptResponseId) {
      await this.move(run, 'RECONCILIATION_REQUIRED', null, 'OpenAI submission has no recorded response ID. Verify it before rescheduling.');
      return;
    }

    const context = await this.scheduledPublicationRepository.context(run);
    if (!context || (run.scriptRevision && context.revision !== run.scriptRevision)) {
      await this.move(run, 'FAILED', null, 'The content changed or is no longer available for this company.');
      return;
    }
    if (!run.scriptResponseId && run.attempts > 3) {
      await this.move(run, 'FAILED', null, 'Editorial preparation exhausted its attempts.');
      return;
    }

    let submitted = false;
    try {
      this.contentStrategy.requireMedia(context.instructions);
      if (run.scriptResponseId) {
        if (run.attempts > 12) {
          await this.move(run, 'FAILED', null, 'The OpenAI response did not complete within the recovery budget.');
          return;
        }
        const draft = await this.scriptProvider.result(run.scriptResponseId);
        if (!draft) {
          await this.wait(run, 'Waiting for the OpenAI webhook.', CALLBACK_RECOVERY_MS, run.attempts);
          return;
        }
        this.contentStrategy.validateDraft(context.instructions, draft);
        await this.scheduledPublicationRepository.prepare(run, draft, context.revision);
        return;
      }

      if (!await this.scheduledPublicationRepository.startScript(run, context.revision)) return;
      submitted = true;
      const responseId = await this.scriptProvider.submit(context.instructions);
      if (!await this.scheduledPublicationRepository.saveScriptResponse(run, responseId)) return;
      await this.wait(run, 'Waiting for the OpenAI webhook.', CALLBACK_RECOVERY_MS, 0);
    } catch (error) {
      if (error instanceof ScriptSubmissionUncertain || (submitted && !(error instanceof ContentStrategyError))) {
        await this.move(run, 'RECONCILIATION_REQUIRED', null, 'OpenAI submission outcome is unknown. Verify the request before retrying.');
        return;
      }
      if (submitted) await this.scheduledPublicationRepository.saveScriptResponse(run, null);
      if (error instanceof ContentStrategyError && error.retryable && run.attempts < (run.scriptResponseId ? 12 : 3)) {
        const delay = run.scriptResponseId ? CALLBACK_RECOVERY_MS : 5_000 * 2 ** (run.attempts - 1);
        await this.wait(run, error.message, delay, run.attempts);
        return;
      }
      await this.move(run, 'FAILED', null, error instanceof ContentStrategyError || error instanceof ConflictException
        ? error.message : 'Unable to persist the editorial preparation.');
    }
  }

  private async render(run: ScheduledRun): Promise<void> {
    const generation = run.generation;
    if (generation?.asset?.ready) {
      await this.move(run, 'VALIDATE', new Date());
      return;
    }
    if (!generation || ['FAILED', 'READY'].includes(generation.status) || Date.now() - generation.createdAt.getTime() > MAX_STAGE_MS) {
      const stage = generation?.error?.startsWith('Render submission outcome is unknown') ? 'RECONCILIATION_REQUIRED' : 'FAILED';
      await this.move(run, stage, null, generation?.error ?? 'Rendering failed, exceeded its one-hour limit, or has no ready asset.');
      return;
    }

    try {
      const video = await this.videoGeneration.execute({ companyId: run.companyId, videoGenerationId: generation.id });
      if (video.status === 'READY' && video.videoAssetId) {
        await this.move(run, 'VALIDATE', new Date());
        return;
      }
      if (video.status === 'FAILED') {
        const uncertain = video.errorMessage?.startsWith('Render submission outcome is unknown');
        await this.move(run, uncertain ? 'RECONCILIATION_REQUIRED' : 'FAILED', null, video.errorMessage ?? 'Video generation failed.');
        return;
      }
      await this.wait(run, 'Waiting for the Creatomate webhook.', CALLBACK_RECOVERY_MS, 0);
    } catch (error) {
      if (error instanceof VideoRenderRequestError && !error.retryable) {
        await this.move(run, 'FAILED', null, error.message);
        return;
      }
      if (run.attempts >= 3 && (generation.renderJobId || error instanceof VideoRenderRequestError)) {
        await this.move(run, 'FAILED', null, 'Video generation exhausted its recovery attempts.');
        return;
      }
      await this.wait(run, 'Could not complete the render step. Waiting for provider reconciliation.', CALLBACK_RECOVERY_MS, run.attempts);
    }
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

  private async wait(run: ScheduledRun, reason: string, delay: number, attempts?: number): Promise<void> {
    await this.move(run, run.stage, new Date(Date.now() + delay), reason, attempts);
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
  }
}
