import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';
import { SalesGroupBy } from './sales-series';

export class SalesQueryDto {
  /** По умолчанию — 30 дней до to */
  @IsOptional()
  @IsISO8601()
  from?: string;

  /** По умолчанию — сейчас */
  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  groupBy: SalesGroupBy = 'day';
}

@ApiTags('admin / analytics')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  /**
   * Dashboard: пользователи, книги, аудиокниги, заказы по статусам, выручка,
   * последние заказы, популярные товары, тревоги (платежи на разбор, мало на складе).
   */
  @Get('dashboard')
  dashboard() {
    return this.analytics.dashboard();
  }

  /** График продаж: выручка (тыйын) и число заказов по периодам. */
  @Get('analytics/sales')
  sales(@Query() query: SalesQueryDto) {
    return this.analytics.sales(query.from, query.to, query.groupBy);
  }
}
