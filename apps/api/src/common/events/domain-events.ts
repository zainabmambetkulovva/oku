import { OrderStatus } from '@prisma/client';

/**
 * Доменные события. Модули (заказы, платежи, доступ) сообщают о том, что произошло,
 * а реакция (уведомления, письма) живёт в отдельных модулях.
 * Публикуются только после успешного завершения транзакции — см. DomainEventOutbox.
 */
export const DomainEvents = {
  OrderCreated: 'order.created',
  OrderStatusChanged: 'order.status.changed',
  AudioAccessGranted: 'audio.access.granted',
} as const;

export interface OrderCreatedEvent {
  orderId: string;
}

export interface OrderStatusChangedEvent {
  orderId: string;
  oldStatus: OrderStatus;
  newStatus: OrderStatus;
  comment?: string;
}

export interface AudioAccessGrantedEvent {
  userId: string;
  audiobookId: string;
  /** order — после оплаты; admin — выдан администратором */
  source: 'order' | 'admin';
}

export type DomainEvent =
  | { name: typeof DomainEvents.OrderCreated; payload: OrderCreatedEvent }
  | { name: typeof DomainEvents.OrderStatusChanged; payload: OrderStatusChangedEvent }
  | { name: typeof DomainEvents.AudioAccessGranted; payload: AudioAccessGrantedEvent };
