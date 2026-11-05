import { OrderStatus } from '@prisma/client';

/**
 * Разрешённые переходы статусов заказа. Все изменения статуса проходят через
 * OrderLifecycleService и записываются в историю.
 *
 *   PENDING ─▶ PAID ─▶ PROCESSING ─▶ SHIPPED ─▶ COMPLETED
 *      │        │          │                       │
 *      ▼        ▼          ▼                       ▼
 *  CANCELLED  (заказ из аудиокниг сразу COMPLETED)  REFUNDED
 *
 * Наличные при получении: PENDING ─▶ PROCESSING (подтвердил администратор).
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ['PAID', 'PROCESSING', 'CANCELLED'],
  PAID: ['PROCESSING', 'COMPLETED', 'CANCELLED', 'REFUNDED'],
  PROCESSING: ['SHIPPED', 'COMPLETED', 'CANCELLED', 'REFUNDED'],
  SHIPPED: ['COMPLETED', 'REFUNDED'],
  COMPLETED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

/** Из каких статусов можно перейти в to. */
export function sourcesFor(to: OrderStatus): OrderStatus[] {
  return (Object.keys(ORDER_TRANSITIONS) as OrderStatus[]).filter((from) =>
    canTransition(from, to),
  );
}

/** Товар ещё на складе магазина: при отмене или возврате остаток восстанавливается. */
export const STOCK_RESERVED_STATUSES: readonly OrderStatus[] = ['PENDING', 'PAID', 'PROCESSING'];
