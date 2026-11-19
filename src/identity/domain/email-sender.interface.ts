export abstract class EmailSender {
  abstract send(input: { to: string; subject: string; text: string; html: string }): Promise<void>;
}
