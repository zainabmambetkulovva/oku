import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { Env } from '../../config/env';
import { MailMessage } from './mail.types';

/**
 * Отправка писем.
 *  - MAIL_TRANSPORT=log  — письмо выводится в лог (разработка, тесты);
 *  - MAIL_TRANSPORT=smtp — отправка через SMTP (любой почтовый сервис).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter?: Transporter;
  private readonly from: string;

  constructor(config: ConfigService<Env, true>) {
    this.from = config.get('MAIL_FROM', { infer: true });

    if (config.get('MAIL_TRANSPORT', { infer: true }) === 'smtp') {
      const user = config.get('SMTP_USER', { infer: true });
      this.transporter = createTransport({
        host: config.get('SMTP_HOST', { infer: true }),
        port: config.get('SMTP_PORT', { infer: true }),
        secure: config.get('SMTP_SECURE', { infer: true }),
        auth: user ? { user, pass: config.get('SMTP_PASSWORD', { infer: true }) } : undefined,
      });
    }
  }

  async send(message: MailMessage): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[mail:log] to=${message.to} subject="${message.subject}"\n${message.text}`);
      return;
    }

    await this.transporter.sendMail({ from: this.from, ...message });
    this.logger.log(`Mail sent to ${message.to}: "${message.subject}"`);
  }
}
