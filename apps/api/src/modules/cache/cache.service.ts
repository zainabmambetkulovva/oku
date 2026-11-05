import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Env } from '../../config/env';

const VERSION_KEY = 'catalog:version';

/**
 * Кэш публичного каталога в Redis.
 * Сброс — через номер версии: любое изменение каталога увеличивает версию,
 * и старые ключи перестают читаться (истекают сами по TTL).
 * Без REDIS_URL, а также при недоступном Redis кэш просто не используется.
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly redis?: Redis;

  constructor(config: ConfigService<Env, true>) {
    const url = config.get('REDIS_URL', { infer: true });
    if (url) {
      this.redis = new Redis(url, {
        lazyConnect: false,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      });
      this.redis.on('error', (error) => this.logger.warn(`Redis error: ${error.message}`));
    }
  }

  get isEnabled(): boolean {
    return this.redis !== undefined;
  }

  /** Значение из кэша каталога или результат loader (с сохранением в кэш). */
  async catalog<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
    if (!this.redis) {
      return loader();
    }

    let fullKey: string | undefined;
    try {
      const version = (await this.redis.get(VERSION_KEY)) ?? '0';
      fullKey = `catalog:v${version}:${key}`;
      const cached = await this.redis.get(fullKey);
      if (cached !== null) {
        return JSON.parse(cached) as T;
      }
    } catch (error) {
      this.logger.warn(`Cache read failed: ${(error as Error).message}`);
      return loader();
    }

    const value = await loader();
    try {
      await this.redis.set(fullKey, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      this.logger.warn(`Cache write failed: ${(error as Error).message}`);
    }
    return value;
  }

  /** Сбрасывает весь кэш каталога. Вызывается после любого изменения в админке. */
  async invalidateCatalog(): Promise<void> {
    if (!this.redis) {
      return;
    }
    try {
      await this.redis.incr(VERSION_KEY);
    } catch (error) {
      this.logger.warn(`Cache invalidation failed: ${(error as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis?.quit().catch(() => undefined);
  }
}
