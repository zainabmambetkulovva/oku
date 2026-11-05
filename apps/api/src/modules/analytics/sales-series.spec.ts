import { buildSeries, periodsBetween, periodStart } from './sales-series';

describe('sales series', () => {
  it('uses Bishkek time (UTC+6) for period boundaries', () => {
    // 20:00 UTC 4 ноября — уже 02:00 5 ноября в Бишкеке
    expect(periodStart(new Date('2026-11-04T20:00:00Z'), 'day')).toBe('2026-11-05');
    expect(periodStart(new Date('2026-11-04T17:00:00Z'), 'day')).toBe('2026-11-04');
  });

  it('starts weeks on Monday and months on the 1st', () => {
    expect(periodStart(new Date('2026-11-05T06:00:00Z'), 'week')).toBe('2026-11-02');
    expect(periodStart(new Date('2026-11-05T06:00:00Z'), 'month')).toBe('2026-11-01');
  });

  it('lists every period in the range', () => {
    expect(
      periodsBetween(new Date('2026-10-30T06:00:00Z'), new Date('2026-11-02T06:00:00Z'), 'day'),
    ).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
    expect(
      periodsBetween(new Date('2026-09-15T06:00:00Z'), new Date('2026-11-02T06:00:00Z'), 'month'),
    ).toEqual(['2026-09-01', '2026-10-01', '2026-11-01']);
  });

  it('sums revenue, counts distinct orders and fills empty periods with zeros', () => {
    const series = buildSeries(
      [
        { paidAt: new Date('2026-11-01T06:00:00Z'), amount: 65_000, orderId: 'a' },
        { paidAt: new Date('2026-11-01T08:00:00Z'), amount: 45_000, orderId: 'b' },
        { paidAt: new Date('2026-11-03T08:00:00Z'), amount: 10_000, orderId: 'c' },
      ],
      new Date('2026-11-01T00:00:00Z'),
      new Date('2026-11-03T12:00:00Z'),
      'day',
    );
    expect(series).toEqual([
      { period: '2026-11-01', ordersCount: 2, revenue: 110_000 },
      { period: '2026-11-02', ordersCount: 0, revenue: 0 },
      { period: '2026-11-03', ordersCount: 1, revenue: 10_000 },
    ]);
  });
});
