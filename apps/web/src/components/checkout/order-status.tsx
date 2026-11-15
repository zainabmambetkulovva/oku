'use client';

import { useTranslations } from 'next-intl';
import type { OrderDetails } from '@/lib/types';

export const ORDER_STATUS_STYLE: Record<OrderDetails['status'], string> = {
  PENDING: 'bg-[#f6e3c3] text-[#7a4a12]',
  PAID: 'bg-[#e3ecd5] text-[#3f5a24]',
  PROCESSING: 'bg-[#e3ecd5] text-[#3f5a24]',
  SHIPPED: 'bg-[#dfe7f1] text-[#2c4a6b]',
  COMPLETED: 'bg-[#e3ecd5] text-[#3f5a24]',
  CANCELLED: 'bg-sand/60 text-ink/70',
  REFUNDED: 'bg-sand/60 text-ink/70',
};

/** Статус заказа; наличный заказ без подтверждения — «Принят, ждёт подтверждения». */
export function OrderStatusBadge({
  order,
  className = '',
}: {
  order: Pick<OrderDetails, 'status' | 'paymentMethod'>;
  className?: string;
}) {
  const t = useTranslations('orderPage');
  const key =
    order.status === 'PENDING' && order.paymentMethod === 'CASH' ? 'PENDING_CASH' : order.status;
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${ORDER_STATUS_STYLE[order.status]} ${className}`}
      data-testid="order-status"
    >
      {t(`status.${key}`)}
    </span>
  );
}
