import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { Env } from '../../../config/env';
import {
  CreatePaymentInput,
  CreatedPayment,
  type PaymentEventStatus,
  PaymentProvider,
  VerifiedPaymentEvent,
} from './payment-provider';

export const TEST_SIGNATURE_HEADER = 'x-test-signature';

export interface TestWebhookBody {
  eventId: string;
  paymentId: string;
  status: PaymentEventStatus;
  /** Сумма в тыйынах */
  amount: number;
  transactionId?: string;
}

/** JSON с ключами по алфавиту — одинаковая строка для подписи и проверки. */
export function canonicalJson(body: object): string {
  return JSON.stringify(
    Object.fromEntries(Object.entries(body).sort(([a], [b]) => a.localeCompare(b))),
  );
}

export function signTestWebhook(body: TestWebhookBody, secret: string): string {
  return createHmac('sha256', secret).update(canonicalJson(body)).digest('hex');
}

/**
 * Тестовый провайдер для разработки и тестов: «страница оплаты» — на frontend,
 * результат приходит вебхуком с HMAC-подписью. В production запрещён (config/env.ts).
 */
@Injectable()
export class TestPaymentProvider implements PaymentProvider {
  readonly name = 'test';
  private readonly secret: string;
  private readonly frontendUrl: string;

  constructor(config: ConfigService<Env, true>) {
    this.secret = config.get('TEST_PAYMENT_SECRET', { infer: true });
    this.frontendUrl = config.get('FRONTEND_URL', { infer: true }).replace(/\/+$/, '');
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatedPayment> {
    const params = new URLSearchParams({
      paymentId: input.paymentId,
      order: input.orderNumber,
      amount: String(input.amount),
    });
    return {
      paymentUrl: `${this.frontendUrl}/${input.locale}/checkout/test-payment?${params.toString()}`,
    };
  }

  async parseWebhook(request: Request): Promise<VerifiedPaymentEvent | null> {
    const body = request.body as Partial<TestWebhookBody>;
    const signature = request.header(TEST_SIGNATURE_HEADER);
    if (
      !signature ||
      typeof body?.eventId !== 'string' ||
      typeof body.paymentId !== 'string' ||
      typeof body.amount !== 'number' ||
      !['SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED'].includes(body.status as string)
    ) {
      return null;
    }

    const expected = Buffer.from(signTestWebhook(body as TestWebhookBody, this.secret));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      return null;
    }

    return {
      externalEventId: body.eventId,
      paymentId: body.paymentId,
      providerPaymentId: body.transactionId,
      status: body.status as PaymentEventStatus,
      amount: body.amount,
      eventType: `payment.${body.status!.toLowerCase()}`,
      payload: body as Record<string, unknown>,
    };
  }

  /** Подпись для симуляции оплаты в разработке. */
  sign(body: TestWebhookBody): string {
    return signTestWebhook(body, this.secret);
  }
}
