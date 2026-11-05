import { Prisma } from '@prisma/client';
import { StorageService } from '../storage/storage.service';

export const orderInclude = {
  items: { orderBy: { createdAt: 'asc' } },
  statusHistory: { orderBy: { createdAt: 'asc' } },
  payments: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.OrderInclude;

export type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

/** Заказ для покупателя: снимок товаров, суммы, доставка, история, платежи. */
export function toOrderResponse(order: OrderWithRelations, storage: StorageService) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    items: order.items.map((item) => ({
      id: item.id,
      productType: item.productType,
      bookId: item.bookId,
      audiobookId: item.audiobookId,
      title: item.productTitle,
      author: item.productAuthor,
      coverUrl: storage.publicUrl(item.productCoverKey),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    })),
    subtotal: order.subtotal,
    deliveryPrice: order.deliveryPrice,
    discount: order.discount,
    total: order.total,
    currency: order.currency,
    recipientName: order.recipientName,
    recipientPhone: order.recipientPhone,
    deliveryMethod: order.deliveryMethod,
    deliveryAddress: order.deliveryAddress,
    paymentMethod: order.paymentMethod,
    comment: order.comment,
    /** До этого времени онлайн-заказ нужно оплатить */
    expiresAt: order.expiresAt,
    createdAt: order.createdAt,
    completedAt: order.completedAt,
    cancelledAt: order.cancelledAt,
    statusHistory: order.statusHistory.map((entry) => ({
      oldStatus: entry.oldStatus,
      newStatus: entry.newStatus,
      comment: entry.comment,
      createdAt: entry.createdAt,
    })),
    payments: order.payments.map((payment) => ({
      id: payment.id,
      provider: payment.provider,
      status: payment.status,
      amount: payment.amount,
      paymentUrl: payment.status === 'PENDING' ? payment.paymentUrl : null,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
    })),
  };
}

export type OrderResponse = ReturnType<typeof toOrderResponse>;
