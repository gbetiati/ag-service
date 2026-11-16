export class ContentScene {
  constructor(
    public readonly id: string,
    public readonly contentId: string,
    public readonly sceneIndex: number,
    public readonly heading: string | null,
    public readonly shotList: string | null,
    public readonly visualNotes: string | null,
    public readonly durationSeconds: number | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(props: {
    contentId: string;
    sceneIndex: number;
    heading?: string | null;
    shotList?: string | null;
    visualNotes?: string | null;
    durationSeconds?: number | null;
  }): ContentScene {
    return new ContentScene(
      crypto.randomUUID(),
      props.contentId,
      props.sceneIndex,
      props.heading ?? null,
      props.shotList ?? null,
      props.visualNotes ?? null,
      props.durationSeconds ?? null,
      new Date(),
      new Date(),
    );
  }
}
