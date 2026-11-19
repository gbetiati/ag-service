import { createHash } from 'node:crypto';
import type {
  ScheduledContentContext,
  ScheduledContentDraft,
} from '../../content-strategy/domain/scheduled-content-ai.interface.js';

export type ScheduleStage =
  | 'PREPARE'
  | 'RENDER'
  | 'VALIDATE'
  | 'APPROVAL'
  | 'PUBLISH'
  | 'PUBLISHING'
  | 'PUBLISHED'
  | 'FAILED'
  | 'RECONCILIATION_REQUIRED';

export type ScheduleKey = { id: string; companyId: string };
export type ScheduleJob = ScheduleKey & { dueAt: number; stage: ScheduleStage };

export type ScheduleContentRevision = {
  title: string;
  script: string | null;
  brief: string | null;
  productId: string | null;
  brandId: string | null;
};

export function contentRevision(content: ScheduleContentRevision): string {
  const { title, script, brief, productId, brandId } = content;
  return createHash('sha256')
    .update(JSON.stringify([title, script, brief, productId, brandId]))
    .digest('hex');
}

export const PREPARATION_LEAD_MS = 180_000;

export const SCHEDULED_BROWNIE_IMAGE_URL =
  'https://www.recipetineats.com/tachyon/2019/01/Nutella-Brownies_4.jpg';

export type ScheduledRun = ScheduleKey & {
  publicationId: string;
  contentId: string;
  socialAccountId: string;
  scheduledFor: Date;
  stage: ScheduleStage;
  nextRunAt: Date | null;
  leaseUntil: Date | null;
  attempts: number;
  scriptResponseId: string | null;
  scriptRevision: string | null;
  contentIdeaId: string | null;
  createdAt: Date;
  errorMessage: string | null;
  pausedQueues: string[];
  validTarget: boolean;
  companyActive: boolean;
  rejected: boolean;
  revisionMatches: boolean;
  approvalMode: 'MANUAL' | 'AUTOMATIC';
  approved: boolean;
  published: boolean;
  generation: {
    id: string;
    status: string;
    error: string | null;
    renderJobId: string | null;
    createdAt: Date;
    asset: { id: string; ready: boolean; publishable: boolean } | null;
  } | null;
  validation: {
    status: string;
    reason: string | null;
    hasRealVision: boolean;
    requiredChecksPassed: boolean;
  } | null;
};

export function scheduledVideoPassed(run: ScheduledRun): boolean {
  return (
    run.revisionMatches &&
    run.generation?.asset?.ready === true /* &&
    run.validation?.status === 'APPROVED' &&
    run.validation.hasRealVision &&
    run.validation.requiredChecksPassed */
  );
}

export abstract class ScheduledPublicationRepository {
  abstract schedule(input: {
    publicationId: string;
    companyId: string;
    scheduledFor: Date;
  }): Promise<ScheduledRun>;
  abstract find(key: ScheduleKey): Promise<ScheduledRun | null>;
  abstract findByPublication(
    companyId: string,
    publicationId: string,
  ): Promise<ScheduledRun | null>;
  abstract due(now: Date): Promise<ScheduleJob[]>;
  abstract claim(job: ScheduleJob, now: Date): Promise<ScheduledRun | null>;
  abstract context(
    run: ScheduledRun,
  ): Promise<{
    instructions: ScheduledContentContext;
    revision: string;
  } | null>;
  abstract startScript(run: ScheduledRun, revision: string): Promise<boolean>;
  abstract saveScriptResponse(run: ScheduledRun, responseId: string | null): Promise<boolean>;
  abstract notifyScript(responseId: string): Promise<void>;
  abstract notifyRender(generationId: string, renderId: string): Promise<void>;
  abstract prepare(
    run: ScheduledRun,
    draft: ScheduledContentDraft,
    expectedRevision: string,
  ): Promise<boolean>;
  abstract advance(
    run: ScheduledRun,
    step: {
      stage: ScheduleStage;
      due: Date | null;
      error?: string;
      attempts?: number;
    },
  ): Promise<ScheduledRun | null>;
  abstract approve(input: {
    companyId: string;
    contentId: string;
    scheduleId?: string;
  }): Promise<boolean>;
}
