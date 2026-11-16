export class AutomationState {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly queueName: string,
    public paused: boolean,
    public reason: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(input: {
    id?: string;
    companyId: string;
    queueName: string;
    paused?: boolean;
    reason?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }): AutomationState {
    const now = new Date();
    return new AutomationState(
      input.id ?? crypto.randomUUID(),
      input.companyId,
      input.queueName,
      input.paused ?? false,
      input.reason ?? null,
      input.createdAt ?? now,
      input.updatedAt ?? now,
    );
  }

  pause(reason?: string) {
    this.paused = true;
    this.reason = reason ?? 'Automation paused by operator.';
  }

  resume() {
    this.paused = false;
    this.reason = null;
  }
}
