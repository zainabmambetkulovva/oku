import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Env } from '../../config/env';
import { OrderLifecycleService } from './order-lifecycle.service';

/** Каждую минуту отменяет онлайн-заказы, которые не оплатили вовремя. */
@Injectable()
export class OrderExpiryJob {
  private readonly logger = new Logger(OrderExpiryJob.name);
  private running = false;
  private readonly enabled: boolean;

  constructor(
    private readonly lifecycle: OrderLifecycleService,
    config: ConfigService<Env, true>,
  ) {
    this.enabled = config.get('JOBS_ENABLED', { infer: true });
  }

  @Cron(CronExpression.EVERY_MINUTE, { name: 'expire-unpaid-orders' })
  async run(): Promise<void> {
    if (!this.enabled || this.running) {
      return;
    }
    this.running = true;
    try {
      await this.lifecycle.expireUnpaid();
    } catch (error) {
      this.logger.error('Failed to expire unpaid orders', (error as Error).stack);
    } finally {
      this.running = false;
    }
  }
}
