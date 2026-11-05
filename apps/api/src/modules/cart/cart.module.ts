import { Module } from '@nestjs/common';
import { ListeningModule } from '../listening/listening.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [ListeningModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
