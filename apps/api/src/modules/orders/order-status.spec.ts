import { canTransition, sourcesFor } from './order-status';
import { generateOrderNumber } from './order-number';

describe('order status transitions', () => {
  it.each([
    ['PENDING', 'PAID'],
    ['PENDING', 'CANCELLED'],
    ['PENDING', 'PROCESSING'],
    ['PAID', 'COMPLETED'],
    ['PROCESSING', 'SHIPPED'],
    ['SHIPPED', 'COMPLETED'],
    ['COMPLETED', 'REFUNDED'],
  ] as const)('allows %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each([
    ['PENDING', 'SHIPPED'],
    ['PENDING', 'REFUNDED'],
    ['CANCELLED', 'PAID'],
    ['REFUNDED', 'COMPLETED'],
    ['SHIPPED', 'CANCELLED'],
    ['COMPLETED', 'PENDING'],
  ] as const)('forbids %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });

  it('lists the statuses an order can be cancelled from', () => {
    expect(sourcesFor('CANCELLED').sort()).toEqual(['PAID', 'PENDING', 'PROCESSING']);
  });
});

describe('generateOrderNumber', () => {
  it('uses the OKU-YYMMDD-XXXXX format without ambiguous characters', () => {
    const number = generateOrderNumber(new Date('2026-11-05T10:00:00Z'));
    expect(number).toMatch(/^OKU-261105-[A-HJKMNP-Z2-9]{5}$/);
  });

  it('is practically unique', () => {
    const numbers = new Set(Array.from({ length: 1000 }, () => generateOrderNumber()));
    expect(numbers.size).toBeGreaterThan(995);
  });
});
