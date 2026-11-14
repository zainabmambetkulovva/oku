import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { Env } from '../../config/env';
import { MailMessage } from './mail.types';

/** Адрес отправки писем через Brevo (транзакционные письма). */
export const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';

/** «OKU24 <no-reply@oku24.kg>» → { name, email }. */
export function parseSender(from: string): { name?: string; email: string } {
  const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(from);
  if (!match) return { email: from.trim() };
  const name = match[1].replace(/^"|"$/g, '').trim();
  return name ? { name, email: match[2].trim() } : { email: match[2].trim() };
}

/**
 * Отправка писем.
 *  - MAIL_TRANSPORT=log   — письмо выводится в лог (разработка, тесты);
 *  - MAIL_TRANSPORT=brevo — отправка через API Brevo (ключ BREVO_API_KEY);
 *  - MAIL_TRANSPORT=smtp  — отправка через SMTP (любой почтовый сервис).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter?: Transporter;
  private readonly brevoApiKey?: string;
  private readonly from: string;

  constructor(config: ConfigService<Env, true>) {
    this.from = config.get('MAIL_FROM', { infer: true });
    const transport = config.get('MAIL_TRANSPORT', { infer: true });

    if (transport === 'smtp') {
      const user = config.get('SMTP_USER', { infer: true });
      this.transporter = createTransport({
        host: config.get('SMTP_HOST', { infer: true }),
        port: config.get('SMTP_PORT', { infer: true }),
        secure: config.get('SMTP_SECURE', { infer: true }),
        auth: user ? { user, pass: config.get('SMTP_PASSWORD', { infer: true }) } : undefined,
      });
    }
    if (transport === 'brevo') {
      this.brevoApiKey = config.get('BREVO_API_KEY', { infer: true });
    }
  }

  async send(message: MailMessage): Promise<void> {
    if (this.brevoApiKey) {
      await this.sendWithBrevo(message, this.brevoApiKey);
      this.logger.log(`Mail sent via Brevo: "${message.subject}"`);
      return;
    }
    if (!this.transporter) {
      this.logger.log(`[mail:log] to=${message.to} subject="${message.subject}"\n${message.text}`);
      return;
    }

    await this.transporter.sendMail({ from: this.from, ...message });
    this.logger.log(`Mail sent to ${message.to}: "${message.subject}"`);
  }

  private async sendWithBrevo(message: MailMessage, apiKey: string): Promise<void> {
    const response = await fetch(BREVO_SEND_URL, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: parseSender(this.from),
        to: [{ email: message.to }],
        subject: message.subject,
        htmlContent: message.html,
        textContent: message.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      // Текст ошибки Brevo без ключа и без содержимого письма
      const details = (await response.text().catch(() => '')).slice(0, 300);
      throw new Error(`Brevo responded with ${response.status}: ${details}`);
    }
  }
}
