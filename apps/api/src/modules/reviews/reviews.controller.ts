import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CreateReviewDto, ReviewsQueryDto, UpdateReviewDto } from './dto/reviews.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  // ─── Книги ─────────────────────────────────────────────────────────────────

  @Public()
  @Get('books/:slug/reviews')
  bookReviews(@Param('slug') slug: string, @Query() query: ReviewsQueryDto) {
    return this.reviews.listForProduct('book', slug, query);
  }

  /** Средняя оценка, количество отзывов и распределение по звёздам. */
  @Public()
  @Get('books/:slug/reviews/summary')
  bookSummary(@Param('slug') slug: string) {
    return this.reviews.summary('book', slug);
  }

  /** Отзыв публикуется сразу. Один отзыв на товар — второй раз 409, нужно изменить свой. */
  @ApiBearerAuth()
  @Post('books/:slug/reviews')
  reviewBook(
    @AuthUser() user: AuthenticatedUser,
    @Param('slug') slug: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviews.create(user, 'book', slug, dto);
  }

  // ─── Аудиокниги ────────────────────────────────────────────────────────────

  @Public()
  @Get('audiobooks/:slug/reviews')
  audiobookReviews(@Param('slug') slug: string, @Query() query: ReviewsQueryDto) {
    return this.reviews.listForProduct('audiobook', slug, query);
  }

  @Public()
  @Get('audiobooks/:slug/reviews/summary')
  audiobookSummary(@Param('slug') slug: string) {
    return this.reviews.summary('audiobook', slug);
  }

  @ApiBearerAuth()
  @Post('audiobooks/:slug/reviews')
  reviewAudiobook(
    @AuthUser() user: AuthenticatedUser,
    @Param('slug') slug: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviews.create(user, 'audiobook', slug, dto);
  }

  // ─── Свои отзывы ───────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @Get('users/me/reviews')
  mine(@AuthUser() user: AuthenticatedUser, @Query() query: ReviewsQueryDto) {
    return this.reviews.mine(user, query);
  }

  @ApiBearerAuth()
  @Patch('reviews/:id')
  update(
    @AuthUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviews.update(user, id, dto);
  }

  @ApiBearerAuth()
  @Delete('reviews/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@AuthUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.reviews.remove(user, id);
  }
}
