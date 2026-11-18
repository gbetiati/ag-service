export type VideoGenerationStatus = 'QUEUED' | 'RENDERING' | 'READY' | 'FAILED';

export class VideoGeneration {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly contentId: string,
    public readonly provider: string,
    public status: VideoGenerationStatus,
    public renderJobId: string | null,
    public videoAssetId: string | null,
    public readonly request: Record<string, unknown>,
    public errorMessage: string | null,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  static create(input: {
    companyId: string;
    contentId: string;
    provider: string;
    request: Record<string, unknown>;
  }): VideoGeneration {
    const now = new Date();
    return new VideoGeneration(
      crypto.randomUUID(),
      input.companyId,
      input.contentId,
      input.provider,
      'QUEUED',
      null,
      null,
      input.request,
      null,
      now,
      now,
    );
  }
}
