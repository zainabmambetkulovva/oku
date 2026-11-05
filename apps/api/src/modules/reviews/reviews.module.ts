import { Module } from '@nestjs/common';
import { AdminReviewsController } from './admin-reviews.controller';
import { RatingsService } from './ratings.service';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  controllers: [ReviewsController, AdminReviewsController],
  providers: [ReviewsService, RatingsService],
  exports: [RatingsService],
})
export class ReviewsModule {}
