import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { EmailSender } from '../../domain/email-sender.interface.js';

@Injectable()
export class SmtpEmailSender extends EmailSender {
  constructor(private readonly config: ConfigService) {
    super();
  }

  async send(input: { to: string; subject: string; text: string; html: string }): Promise<void> {
    const portValue = this.config.getOrThrow<string>('SMTP_PORT');
    const port = Number(portValue);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('SMTP_PORT must be a valid TCP port.');
    }
    const secureValue = this.config.get<string>('SMTP_SECURE');
    const secure = secureValue === undefined ? port === 465 : secureValue.toLowerCase() === 'true';
    if (secureValue !== undefined && !['true', 'false'].includes(secureValue.toLowerCase())) {
      throw new Error('SMTP_SECURE must be either true or false.');
    }

    const transporter = nodemailer.createTransport({
      host: this.config.getOrThrow<string>('SMTP_HOST'),
      port,
      secure,
      requireTLS: !secure,
      auth: {
        user: this.config.getOrThrow<string>('SMTP_USER'),
        pass: this.config.getOrThrow<string>('SMTP_PASSWORD'),
      },
    });
    await transporter.sendMail({
      from: this.config.getOrThrow<string>('SMTP_FROM'),
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
  }
}
