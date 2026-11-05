import type { Request } from 'express';

export interface CreatePaymentInput {
  /** Наш id платежа (payments.id) */
  paymentId: string;
  orderNumber: string;
  /** Сумма в тыйынах */
  amount: number;
  currency: string;
  /** Куда вернуть покупателя после оплаты */
  returnUrl: string;
}

export interface CreatedPayment {
  /** Страница оплаты у провайдера */
  paymentUrl: string;
  /** Идентификатор платежа у провайдера, если известен сразу */
  providerPaymentId?: string;
}

export type PaymentEventStatus = 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'REFUNDED';

/** Уведомление провайдера после проверки подписи. */
export interface VerifiedPaymentEvent {
  /** Уникальный id события у провайдера — защита от повторной обработки */
  externalEventId: string;
  /** Наш id платежа */
  paymentId: string;
  providerPaymentId?: string;
  status: PaymentEventStatus;
  /** Сумма в тыйынах */
  amount: number;
  eventType: string;
  payload: Record<string, unknown>;
}

export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<CreatedPayment>;
  /** Проверяет подпись уведомления. null — подпись неверна или формат неизвестен. */
  parseWebhook(request: Request): Promise<VerifiedPaymentEvent | null>;
}

export const PAYMENT_PROVIDERS = Symbol('PAYMENT_PROVIDERS');
