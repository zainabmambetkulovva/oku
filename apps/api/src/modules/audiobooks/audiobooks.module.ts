import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { AdminAudiobooksController } from './admin-audiobooks.controller';
import { AdminAudiobooksService } from './admin-audiobooks.service';
import { AudiobooksController } from './audiobooks.controller';
import { AudiobooksService } from './audiobooks.service';

@Module({
  imports: [CategoriesModule, ReviewsModule],
  controllers: [AudiobooksController, AdminAudiobooksController],
  providers: [AudiobooksService, AdminAudiobooksService],
})
export class AudiobooksModule {}
