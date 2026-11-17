import { configErrorHandler, parseConfigProblems } from './config-error';

const message =
  'Некорректные переменные окружения:\n  - PAYMENT_PROVIDER: тестовый провайдер в production запрещён\n  - FINIK_PUBLIC_KEY: обязателен при PAYMENT_PROVIDER=finik';

const call = (url: string) => {
  const response = { writeHead: jest.fn(), end: jest.fn() };
  configErrorHandler(message)({ url } as never, response as never);
  return {
    status: response.writeHead.mock.calls[0][0],
    body: JSON.parse(response.end.mock.calls[0][0]),
  };
};

describe('config error mode', () => {
  it('parses variable names and reasons', () => {
    expect(parseConfigProblems(message)).toEqual([
      { variable: 'PAYMENT_PROVIDER', reason: 'тестовый провайдер в production запрещён' },
      { variable: 'FINIK_PUBLIC_KEY', reason: 'обязателен при PAYMENT_PROVIDER=finik' },
    ]);
  });

  it('lists the problems only on the health endpoint', () => {
    const health = call('/api/v1/health');
    expect(health.status).toBe(503);
    expect(health.body.configProblems).toHaveLength(2);

    const other = call('/api/v1/books?limit=1');
    expect(other.status).toBe(503);
    expect(other.body.configProblems).toBeUndefined();
  });
});
