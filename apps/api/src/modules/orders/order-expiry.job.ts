import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Env } from '../../config/env';
import { OrderLifecycleService } from './order-lifecycle.service';

const ON_REQUEST_INTERVAL_MS = 60_000;

/**
 * Отменяет онлайн-заказы, которые не оплатили вовремя, и возвращает товар на склад.
 * На обычном сервере — по расписанию каждую минуту (JOBS_ENABLED).
 * В serverless (Vercel) расписание не работает, поэтому проверка запускается
 * при обращениях к заказам (ORDER_EXPIRY_ON_REQUEST), не чаще раза в минуту.
 */
@Injectable()
export class OrderExpiryJob {
  private readonly logger = new Logger(OrderExpiryJob.name);
  private running = false;
  private lastOnRequestRun = 0;
  private readonly enabled: boolean;
  private readonly onRequest: boolean;

  constructor(
    private readonly lifecycle: OrderLifecycleService,
    config: ConfigService<Env, true>,
  ) {
    this.enabled = config.get('JOBS_ENABLED', { infer: true });
    this.onRequest = config.get('ORDER_EXPIRY_ON_REQUEST', { infer: true });
  }

  @Cron(CronExpression.EVERY_MINUTE, { name: 'expire-unpaid-orders' })
  async run(): Promise<void> {
    if (this.enabled) {
      await this.execute();
    }
  }

  /** Вызывается перед оформлением и просмотром заказов. Ошибки не прерывают запрос. */
  async runOnRequest(now = Date.now()): Promise<void> {
    if (!this.onRequest || now - this.lastOnRequestRun < ON_REQUEST_INTERVAL_MS) {
      return;
    }
    this.lastOnRequestRun = now;
    await this.execute();
  }

  private async execute(): Promise<void> {
    if (this.running) {
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
