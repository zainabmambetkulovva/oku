import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Ошибки запросов не логируются здесь: ожидаемые (дубликат и т.п.) обрабатывает код,
    // неожиданные логирует AllExceptionsFilter вместе с запросом
    super({ log: ['warn'] });
  }

  /** Подключение при старте: если база недоступна, приложение не запустится. */
  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Connected to database');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
