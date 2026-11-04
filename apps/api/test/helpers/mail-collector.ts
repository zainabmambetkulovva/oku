import { MailMessage } from '../../src/modules/mail/mail.types';

/** Подменяет MailService в тестах: письма сохраняются в памяти. */
export class MailCollector {
  readonly messages: MailMessage[] = [];

  async send(message: MailMessage): Promise<void> {
    this.messages.push(message);
  }

  clear(): void {
    this.messages.length = 0;
  }

  to(email: string): MailMessage[] {
    return this.messages.filter((message) => message.to === email);
  }

  /** Токен из ссылки в последнем письме на адрес (…?token=XXX). */
  lastToken(email: string): string {
    const last = this.to(email).at(-1);
    const token = last && /[?&]token=([^\s&]+)/.exec(last.text)?.[1];
    if (!token) {
      throw new Error(`No e-mail with a token was sent to ${email}`);
    }
    return decodeURIComponent(token);
  }
}
