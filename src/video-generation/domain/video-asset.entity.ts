export type VideoAssetStatus = 'QUEUED' | 'RENDERING' | 'READY' | 'FAILED';

export class VideoAsset {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly contentId: string,
    public readonly provider: string,
    public readonly status: VideoAssetStatus,
    public readonly renderJobId: string | null,
    public readonly storageKey: string | null,
    public readonly mimeType: string | null,
    public readonly sizeBytes: number | null,
    public readonly durationSeconds: number | null,
    public readonly metadata: Record<string, unknown> | null,
    public readonly errorMessage: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(props: {
    id?: string;
    companyId: string;
    contentId: string;
    provider: string;
    status?: VideoAssetStatus;
    renderJobId?: string | null;
    storageKey?: string | null;
    mimeType?: string | null;
    sizeBytes?: number | null;
    durationSeconds?: number | null;
    metadata?: Record<string, unknown> | null;
    errorMessage?: string | null;
  }): VideoAsset {
    return new VideoAsset(
      props.id ?? crypto.randomUUID(),
      props.companyId,
      props.contentId,
      props.provider,
      props.status ?? 'QUEUED',
      props.renderJobId ?? null,
      props.storageKey ?? null,
      props.mimeType ?? null,
      props.sizeBytes ?? null,
      props.durationSeconds ?? null,
      props.metadata ?? null,
      props.errorMessage ?? null,
      new Date(),
      new Date(),
    );
  }
}
