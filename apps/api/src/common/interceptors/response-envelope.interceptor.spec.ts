import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { ResponseEnvelopeInterceptor } from './response-envelope.interceptor';

describe('ResponseEnvelopeInterceptor', () => {
  const interceptor = new ResponseEnvelopeInterceptor();
  const run = (body: unknown) =>
    lastValueFrom(
      interceptor.intercept({} as ExecutionContext, { handle: () => of(body) } as CallHandler),
    );

  it('wraps a plain object into { data }', async () => {
    await expect(run({ id: 1 })).resolves.toEqual({ data: { id: 1 } });
  });

  it('wraps arrays and primitives', async () => {
    await expect(run([1, 2])).resolves.toEqual({ data: [1, 2] });
    await expect(run('ok')).resolves.toEqual({ data: 'ok' });
  });

  it('turns an empty response into { data: null }', async () => {
    await expect(run(undefined)).resolves.toEqual({ data: null });
  });

  it('keeps an already paginated { data, meta } response', async () => {
    const paginated = { data: [{ id: 1 }], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } };
    await expect(run(paginated)).resolves.toBe(paginated);
  });

  it('wraps objects that merely contain a data field', async () => {
    await expect(run({ data: 1, other: 2 })).resolves.toEqual({ data: { data: 1, other: 2 } });
  });
});
