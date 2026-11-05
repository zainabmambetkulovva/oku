import { ConfigService } from '@nestjs/config';
import { Env } from '../../config/env';
import { CacheService } from './cache.service';

const config = (values: Partial<Env>) =>
  ({ get: (key: keyof Env) => values[key] }) as unknown as ConfigService<Env, true>;

describe('CacheService', () => {
  it('calls the loader every time when Redis is not configured', async () => {
    const cache = new CacheService(config({}));
    const loader = jest.fn().mockResolvedValue({ value: 1 });

    expect(cache.isEnabled).toBe(false);
    await expect(cache.catalog('key', 60, loader)).resolves.toEqual({ value: 1 });
    await expect(cache.catalog('key', 60, loader)).resolves.toEqual({ value: 1 });
    expect(loader).toHaveBeenCalledTimes(2);
    await expect(cache.invalidateCatalog()).resolves.toBeUndefined();
  });

  it('falls back to the loader when Redis is unavailable', async () => {
    // Порт, на котором заведомо нет Redis
    const cache = new CacheService(config({ REDIS_URL: 'redis://127.0.0.1:1' }));
    jest
      .spyOn((cache as unknown as { logger: { warn: () => void } }).logger, 'warn')
      .mockImplementation(() => undefined);
    const loader = jest.fn().mockResolvedValue('fresh');

    await expect(cache.catalog('key', 60, loader)).resolves.toBe('fresh');
    expect(loader).toHaveBeenCalledTimes(1);
    await cache.onModuleDestroy();
  });
});
