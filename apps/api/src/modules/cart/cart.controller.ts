import { Controller, Get, Post, Delete, Param, Body, Query } from '@nestjs/common';
import { CartService } from './cart.service';
import { AuthUser } from '../../common/decorators/auth-user.decorator';

export class AddToCartDto {
  bookId?: string;
  audiobookId?: string;
  quantity?: number;
}

@Controller('cart')
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  async getCart(@AuthUser() user: any) {
    return this.cartService.getCart(user.userId);
  }

  @Post('items')
  async addItem(@AuthUser() user: any, @Body() dto: AddToCartDto) {
    return this.cartService.addItem(user.userId, dto.bookId, dto.audiobookId, dto.quantity);
  }

  @Delete('items/:itemId')
  async removeItem(@AuthUser() user: any, @Param('itemId') itemId: string) {
    const cart = await this.cartService.getCart(user.userId);
    return this.cartService.removeItem(cart.id, itemId);
  }

  @Post('items/:itemId/quantity')
  async updateQuantity(
    @AuthUser() user: any,
    @Param('itemId') itemId: string,
    @Body('quantity') quantity: number,
  ) {
    const cart = await this.cartService.getCart(user.userId);
    return this.cartService.updateQuantity(cart.id, itemId, quantity);
  }
}
