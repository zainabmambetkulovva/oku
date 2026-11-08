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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminReviewsQueryDto, ModerateReviewDto } from './dto/reviews.dto';
import { ReviewsService } from './reviews.service';

/** Модерация отзывов: отзывы публикуются сразу, администратор скрывает или удаляет плохие. */
@ApiTags('admin / reviews')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/reviews')
export class AdminReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  list(@Query() query: AdminReviewsQueryDto) {
    return this.reviews.adminList(query);
  }

  /** REJECTED — скрыть с сайта, APPROVED — снова показать. */
  @Patch(':id')
  moderate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModerateReviewDto,
    @AuthUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.reviews.moderate(id, dto.status, { id: user.id, ip });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @AuthUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.reviews.adminRemove(id, { id: user.id, ip });
  }
}
