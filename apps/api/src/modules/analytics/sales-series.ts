/** Бишкек — UTC+6 круглый год (без перехода на летнее время). */
export const BISHKEK_OFFSET_MS = 6 * 60 * 60 * 1000;

export type SalesGroupBy = 'day' | 'week' | 'month';

export interface SalesPoint {
  /** Начало периода по времени Бишкека: 2026-11-05, неделя — с понедельника, месяц — 2026-11-01 */
  period: string;
  ordersCount: number;
  /** Выручка, тыйын */
  revenue: number;
}

/** Начало периода (день, неделя с понедельника, месяц) для момента времени, по Бишкеку. */
export function periodStart(date: Date, groupBy: SalesGroupBy): string {
  const local = new Date(date.getTime() + BISHKEK_OFFSET_MS);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  let day = local.getUTCDate();

  if (groupBy === 'month') {
    day = 1;
  } else if (groupBy === 'week') {
    const weekday = (local.getUTCDay() + 6) % 7; // понедельник = 0
    const monday = new Date(Date.UTC(year, month, day - weekday));
    return monday.toISOString().slice(0, 10);
  }
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

/** Все периоды между from и to — чтобы на графике не было «дыр» в дни без продаж. */
export function periodsBetween(from: Date, to: Date, groupBy: SalesGroupBy): string[] {
  const periods: string[] = [];
  let cursor = new Date(`${periodStart(from, groupBy)}T00:00:00Z`);
  const last = periodStart(to, groupBy);
  for (let guard = 0; guard < 2000; guard++) {
    const key = cursor.toISOString().slice(0, 10);
    periods.push(key);
    if (key >= last) {
      break;
    }
    if (groupBy === 'month') {
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    } else {
      cursor = new Date(cursor.getTime() + (groupBy === 'week' ? 7 : 1) * 24 * 60 * 60 * 1000);
    }
  }
  return periods;
}

/** Группирует оплаты по периодам. ordersCount — число разных заказов. */
export function buildSeries(
  payments: { paidAt: Date; amount: number; orderId: string }[],
  from: Date,
  to: Date,
  groupBy: SalesGroupBy,
): SalesPoint[] {
  const buckets = new Map(
    periodsBetween(from, to, groupBy).map((period) => [
      period,
      { orders: new Set<string>(), revenue: 0 },
    ]),
  );
  for (const payment of payments) {
    const bucket = buckets.get(periodStart(payment.paidAt, groupBy));
    if (bucket) {
      bucket.orders.add(payment.orderId);
      bucket.revenue += payment.amount;
    }
  }
  return [...buckets.entries()].map(([period, bucket]) => ({
    period,
    ordersCount: bucket.orders.size,
    revenue: bucket.revenue,
  }));
}
