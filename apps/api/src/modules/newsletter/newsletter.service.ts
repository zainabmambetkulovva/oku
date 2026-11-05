import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { newsletterWelcomeMail } from '../mail/mail.templates';
import { createUnsubscribeToken, verifyUnsubscribeToken } from './newsletter-token';

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);
  private readonly secret: string;
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    config: ConfigService<Env, true>,
  ) {
    this.secret = config.get('JWT_SECRET', { infer: true });
    this.frontendUrl = config.get('FRONTEND_URL', { infer: true }).replace(/\/+$/, '');
  }

  /** Подписка. Ответ одинаковый для новых и существующих адресов. */
  async subscribe(email: string): Promise<void> {
    const existing = await this.prisma.newsletterSubscriber.findUnique({ where: { email } });
    if (existing?.isActive) {
      return;
    }

    await this.prisma.newsletterSubscriber.upsert({
      where: { email },
      create: { email },
      update: { isActive: true, subscribedAt: new Date(), unsubscribedAt: null },
    });

    const url = `${this.frontendUrl}/newsletter/unsubscribe?token=${encodeURIComponent(
      createUnsubscribeToken(email, this.secret),
    )}`;
    try {
      await this.mail.send(newsletterWelcomeMail(email, url));
    } catch (error) {
      this.logger.error(`Failed to send newsletter welcome to ${email}`, (error as Error).stack);
    }
  }

  /** Отписка по ссылке из письма. Повторная отписка ничего не ломает. */
  async unsubscribe(token: string): Promise<void> {
    const email = verifyUnsubscribeToken(token, this.secret);
    if (!email) {
      throw new BadRequestException('Invalid unsubscribe link');
    }
    await this.prisma.newsletterSubscriber.updateMany({
      where: { email, isActive: true },
      data: { isActive: false, unsubscribedAt: new Date() },
    });
  }

  unsubscribeUrlFor(email: string): string {
    return `${this.frontendUrl}/newsletter/unsubscribe?token=${encodeURIComponent(
      createUnsubscribeToken(email, this.secret),
    )}`;
  }
}
