export class ContentHistory {
  constructor(
    public readonly id: string,
    public readonly contentId: string,
    public readonly action: string,
    public readonly previousData: Record<string, unknown> | null,
    public readonly newData: Record<string, unknown> | null,
    public readonly createdAt: Date,
  ) {}
}
