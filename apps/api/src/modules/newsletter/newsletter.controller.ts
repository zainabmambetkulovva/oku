import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthThrottle } from '../../common/throttle/auth-throttle.decorator';
import { IsNormalizedEmail } from '../../common/validation/decorators';
import { NewsletterService } from './newsletter.service';

export class SubscribeDto {
  @IsNormalizedEmail()
  email: string;
}

export class UnsubscribeDto {
  /** Токен из ссылки в письме */
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  token: string;
}

@ApiTags('newsletter')
@Public()
@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletter: NewsletterService) {}

  /** Подписка на новости. Ответ одинаковый для любого адреса. */
  @AuthThrottle()
  @Post('subscribe')
  @HttpCode(HttpStatus.NO_CONTENT)
  subscribe(@Body() dto: SubscribeDto) {
    return this.newsletter.subscribe(dto.email);
  }

  /** Отписка по ссылке из письма — без входа в аккаунт. */
  @AuthThrottle()
  @Post('unsubscribe')
  @HttpCode(HttpStatus.NO_CONTENT)
  unsubscribe(@Body() dto: UnsubscribeDto) {
    return this.newsletter.unsubscribe(dto.token);
  }
}
