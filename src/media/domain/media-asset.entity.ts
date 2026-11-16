export type MediaAssetKind = 'IMAGE' | 'VIDEO' | 'DOCUMENT';

export class MediaAsset {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly productId: string | null,
    public readonly kind: MediaAssetKind,
    public readonly fileName: string,
    public readonly originalName: string,
    public readonly storageKey: string,
    public readonly mimeType: string,
    public readonly sizeBytes: number,
    public readonly width: number | null,
    public readonly height: number | null,
    public readonly metadata: Record<string, unknown> | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
