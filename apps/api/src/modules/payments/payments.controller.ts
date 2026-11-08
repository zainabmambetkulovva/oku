import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { SimulatePaymentDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /**
   * Уведомления платёжной системы. Подпись проверяется для каждого запроса;
   * повторное уведомление обрабатывается один раз.
   */
  @Public()
  @SkipThrottle()
  @Post('webhooks/:provider')
  @HttpCode(HttpStatus.OK)
  async webhook(@Param('provider') provider: string, @Req() request: Request) {
    const outcome = await this.payments.handleWebhook(provider, request);
    return { received: true, outcome };
  }

  /** Только разработка с тестовым провайдером: имитация результата оплаты. */
  @ApiExcludeEndpoint()
  @ApiBearerAuth()
  @Post('test/:paymentId/simulate')
  @HttpCode(HttpStatus.OK)
  async simulate(
    @AuthUser() user: AuthenticatedUser,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Body() dto: SimulatePaymentDto,
  ) {
    return { outcome: await this.payments.simulate(user, paymentId, dto.status) };
  }
}
