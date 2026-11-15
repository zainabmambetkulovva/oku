import { Module } from '@nestjs/common';
import { AdminQuotesController, QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';

@Module({
  controllers: [QuotesController, AdminQuotesController],
  providers: [QuotesService],
})
export class QuotesModule {}
