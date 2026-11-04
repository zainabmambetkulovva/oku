import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { CartService } from './cart.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { AuthUser } from '../../common/decorators/auth-user.decorator';

export class AddToCartDto {
  bookId?: string;
  audiobookId?: string;
  quantity?: number;
}

@ApiTags('cart')
@ApiBearerAuth()
@Controller('cart')
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  async getCart(@AuthUser() user: AuthenticatedUser) {
    return this.cartService.getCart(user.id);
  }

  @Post('items')
  async addItem(@AuthUser() user: AuthenticatedUser, @Body() dto: AddToCartDto) {
    return this.cartService.addItem(user.id, dto.bookId, dto.audiobookId, dto.quantity);
  }

  @Delete('items/:itemId')
  async removeItem(@AuthUser() user: AuthenticatedUser, @Param('itemId') itemId: string) {
    const cart = await this.cartService.getCart(user.id);
    return this.cartService.removeItem(cart.id, itemId);
  }

  @Post('items/:itemId/quantity')
  async updateQuantity(
    @AuthUser() user: AuthenticatedUser,
    @Param('itemId') itemId: string,
    @Body('quantity') quantity: number,
  ) {
    const cart = await this.cartService.getCart(user.id);
    return this.cartService.updateQuantity(cart.id, itemId, quantity);
  }
}
