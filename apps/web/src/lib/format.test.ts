import { formatClock, formatPrice, splitDuration } from './format';

const nbsp = ' ';

describe('formatPrice', () => {
  it('shows tyiyn as som like on the landing page', () => {
    expect(formatPrice(65_000, 'ru')).toBe(`650${nbsp}сом`);
    expect(formatPrice(65_000, 'ky')).toBe(`650${nbsp}сом`);
    expect(formatPrice(65_000, 'en')).toBe(`650${nbsp}som`);
  });

  it('separates thousands and keeps tyiyn when present', () => {
    expect(formatPrice(150_000, 'ru')).toBe(`1${nbsp}500${nbsp}сом`);
    expect(formatPrice(65_050, 'ru')).toBe(`650,50${nbsp}сом`);
    expect(formatPrice(150_050, 'en')).toBe(`1,500.50${nbsp}som`);
  });
});

describe('durations', () => {
  it('splits seconds into hours and minutes', () => {
    expect(splitDuration(4500)).toEqual({ hours: 1, minutes: 15 });
    expect(splitDuration(24)).toEqual({ hours: 0, minutes: 0 });
  });

  it('formats player time', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(75)).toBe('1:15');
    expect(formatClock(3725)).toBe('1:02:05');
    expect(formatClock(-5)).toBe('0:00');
  });
});
