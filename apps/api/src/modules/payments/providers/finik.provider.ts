import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { Env } from '../../../config/env';
import {
  CreatePaymentInput,
  CreatedPayment,
  PaymentEventStatus,
  PaymentProvider,
  VerifiedPaymentEvent,
} from './payment-provider';
import { pemFromEnv, signRequest, verifyRequest } from './request-signer';

export const FINIK_HOSTS = {
  beta: 'beta.api.acquiring.averspay.kg',
  prod: 'api.acquiring.averspay.kg',
} as const;
export const FINIK_PAYMENT_PATH = '/v1/payment';
export const FINIK_WEBHOOK_PATH = '/api/v1/payments/webhooks/finik';

const STATUS_MAP: Record<string, PaymentEventStatus> = {
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  CANCELED: 'CANCELLED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
};

/**
 * Finik (Кыргызстан): оплата через приложение-кошелёк или QR.
 *
 * Формат запросов и вебхуков собран по библиотеке подписи разработчиков Finik
 * (@mancho.devs/authorizer) и открытым интеграциям. Перед запуском его нужно
 * сверить с официальной документацией Finik и проверить оплатой в beta-среде
 * (см. docs/payments-finik.md).
 */
@Injectable()
export class FinikPaymentProvider implements PaymentProvider {
  readonly name = 'finik';
  private readonly logger = new Logger(FinikPaymentProvider.name);

  private readonly host: string;
  private readonly apiKey: string;
  private readonly accountId: string;
  private readonly privateKey: string;
  private readonly publicKey: string;
  private readonly webhookUrl: string;
  private readonly webhookHost: string;

  constructor(config: ConfigService<Env, true>) {
    this.host = FINIK_HOSTS[config.get('FINIK_ENV', { infer: true })];
    this.apiKey = config.get('FINIK_API_KEY', { infer: true }) ?? '';
    this.accountId = config.get('FINIK_ACCOUNT_ID', { infer: true }) ?? '';
    this.privateKey = pemFromEnv(config.get('FINIK_PRIVATE_KEY', { infer: true }) ?? '');
    this.publicKey = pemFromEnv(config.get('FINIK_PUBLIC_KEY', { infer: true }) ?? '');

    const apiUrl = new URL(config.get('API_PUBLIC_URL', { infer: true }));
    this.webhookUrl = new URL(FINIK_WEBHOOK_PATH, apiUrl).toString();
    this.webhookHost = config.get('FINIK_WEBHOOK_HOST', { infer: true }) ?? apiUrl.host;
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatedPayment> {
    const body = {
      // Finik принимает сумму в сомах
      Amount: input.amount / 100,
      CardType: 'FINIK_QR',
      PaymentId: input.paymentId,
      RedirectUrl: input.returnUrl,
      Data: {
        accountId: this.accountId,
        name_en: `OKU_24 order ${input.orderNumber}`,
        webhookUrl: this.webhookUrl,
        additionalData: [
          { fieldId: 'paymentId', value: input.paymentId },
          { fieldId: 'orderNumber', value: input.orderNumber },
        ],
      },
    };
    const headers = {
      Host: this.host,
      'x-api-key': this.apiKey,
      'x-api-timestamp': String(Date.now()),
    };
    const signature = signRequest(
      { method: 'POST', path: FINIK_PAYMENT_PATH, headers, body },
      this.privateKey,
    );

    let response: Response;
    try {
      response = await fetch(`https://${this.host}${FINIK_PAYMENT_PATH}`, {
        method: 'POST',
        redirect: 'manual',
        headers: {
          'content-type': 'application/json',
          'x-api-key': headers['x-api-key'],
          'x-api-timestamp': headers['x-api-timestamp'],
          signature,
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      this.logger.error(`Finik request failed: ${(error as Error).message}`);
      throw new BadGatewayException('Payment provider is unavailable');
    }

    // Ссылка на оплату приходит в Location (редирект) или в JSON-ответе
    const location = response.headers.get('location');
    if (location && response.status >= 300 && response.status < 400) {
      return { paymentUrl: location };
    }
    if (response.ok) {
      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      const url = data.paymentUrl ?? data.url;
      if (typeof url === 'string') {
        return { paymentUrl: url };
      }
    }

    const text = await response.text().catch(() => '');
    this.logger.error(
      `Finik rejected payment ${input.paymentId}: ${response.status} ${text.slice(0, 500)}`,
    );
    throw new BadGatewayException('Payment provider rejected the payment');
  }

  async parseWebhook(request: Request): Promise<VerifiedPaymentEvent | null> {
    const signature = request.header('signature');
    const body = request.body as Record<string, unknown> | undefined;
    if (!signature || !body || typeof body !== 'object') {
      return null;
    }

    const headers: Record<string, string> = { Host: this.webhookHost };
    for (const [key, value] of Object.entries(request.headers)) {
      if (key.toLowerCase().startsWith('x-api-') && typeof value === 'string') {
        headers[key.toLowerCase()] = value;
      }
    }
    const query = Object.fromEntries(
      Object.entries(request.query).filter(([, value]) => typeof value === 'string'),
    ) as Record<string, string>;

    const valid = verifyRequest(
      { method: 'POST', path: request.path, headers, query, body },
      signature,
      this.publicKey,
    );
    if (!valid) {
      this.logger.warn('Finik webhook with an invalid signature rejected');
      return null;
    }

    const fields = (body.fields ?? {}) as Record<string, unknown>;
    const paymentId = fields.paymentId ?? body.PaymentId ?? body.paymentId;
    const status = STATUS_MAP[String(body.status ?? '').toUpperCase()];
    const amount = Number(body.amount);
    const externalEventId = body.id ?? body.transactionId;

    if (typeof paymentId !== 'string' || !status || !Number.isFinite(amount) || !externalEventId) {
      this.logger.warn(
        `Finik webhook with an unexpected format: ${JSON.stringify(body).slice(0, 500)}`,
      );
      return null;
    }

    return {
      externalEventId: String(externalEventId),
      paymentId,
      providerPaymentId: body.transactionId ? String(body.transactionId) : undefined,
      status,
      // Finik присылает сумму в сомах
      amount: Math.round(amount * 100),
      eventType: `payment.${status.toLowerCase()}`,
      payload: body,
    };
  }
}
