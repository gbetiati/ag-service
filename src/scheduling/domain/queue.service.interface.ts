export const QUEUE_NAMES = {
  CONTENT_PLANNING: 'content-planning',
  VIDEO_GENERATION: 'video-generation',
  VIDEO_VALIDATION: 'video-validation',
  SOCIAL_PUBLISHING: 'social-publishing',
  NOTIFICATIONS: 'notifications',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export type QueueScheduleInput = {
  queueName: QueueName;
  jobName: string;
  data: Record<string, unknown>;
  delayMs?: number;
  jobId?: string;
  attempts?: number;
  deduplicate?: boolean;
  removeOnFail?: boolean;
};

export abstract class SchedulingQueueService {
  abstract schedule(input: QueueScheduleInput): Promise<{ queueName: QueueName; jobId: string; status: 'scheduled' }>;
  abstract getJobState(queueName: QueueName, jobId: string): Promise<string>;
  abstract pause(queueName: QueueName, reason?: string): Promise<void>;
  abstract resume(queueName: QueueName): Promise<void>;
  abstract getQueueStatus(queueName: QueueName): Promise<{ queueName: QueueName; paused: boolean; waiting: number; active: number; delayed: number }>;
}
