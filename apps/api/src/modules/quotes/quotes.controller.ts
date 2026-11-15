import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  AdminQuotesQueryDto,
  CreateQuoteDto,
  TodayQuoteQueryDto,
  UpdateQuoteDto,
} from './dto/quotes.dto';
import { QuotesService } from './quotes.service';

@ApiTags('quotes')
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  /** Цитата дня (меняется в полночь по Бишкеку). null — цитат пока нет. */
  @Public()
  @Get('today')
  today(@Query() query: TodayQuoteQueryDto) {
    return this.quotes.today(query.locale);
  }
}

@ApiTags('admin / quotes')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/quotes')
export class AdminQuotesController {
  constructor(private readonly quotes: QuotesService) {}

  @Get()
  list(@Query() query: AdminQuotesQueryDto) {
    return this.quotes.adminList(query);
  }

  @Post()
  create(@Body() dto: CreateQuoteDto, @AuthUser() user: AuthenticatedUser, @Ip() ip: string) {
    return this.quotes.create(dto, { id: user.id, ip });
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuoteDto,
    @AuthUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.quotes.update(id, dto, { id: user.id, ip });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @AuthUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.quotes.remove(id, { id: user.id, ip });
  }
}
