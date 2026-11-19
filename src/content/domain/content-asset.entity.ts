export class ContentAsset {
  constructor(
    public readonly id: string,
    public readonly contentId: string,
    public readonly mediaAssetId: string | null,
    public readonly role: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(props: { contentId: string; mediaAssetId?: string | null; role: string }): ContentAsset {
    return new ContentAsset(
      crypto.randomUUID(),
      props.contentId,
      props.mediaAssetId ?? null,
      props.role,
      new Date(),
      new Date(),
    );
  }
}
