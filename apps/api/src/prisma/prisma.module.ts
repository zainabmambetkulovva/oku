import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/** Глобальный модуль: один PrismaService (одно подключение к БД) на всё приложение. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
