import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('health')
@SkipThrottle()
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOkResponse({ description: 'Приложение и база данных работают' })
  @ApiServiceUnavailableResponse({ description: 'База данных недоступна' })
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }

    return {
      status: 'ok',
      database: 'up',
      uptimeSeconds: Math.round(process.uptime()),
    };
  }
}
