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
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { CartService } from './cart.service';
import { AddCartItemDto, MergeCartDto, UpdateCartItemDto } from './dto/cart.dto';

/** Корзина текущего пользователя. Все ответы — актуальная корзина целиком. */
@ApiTags('cart')
@ApiBearerAuth()
@Controller('cart')
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  get(@AuthUser() user: AuthenticatedUser) {
    return this.cart.getCart(user);
  }

  /** Добавить книгу (с количеством) или аудиокнигу. Повторное добавление книги увеличивает количество. */
  @Post('items')
  addItem(@AuthUser() user: AuthenticatedUser, @Body() dto: AddCartItemDto) {
    return this.cart.addItem(user, dto);
  }

  @Patch('items/:itemId')
  updateQuantity(
    @AuthUser() user: AuthenticatedUser,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cart.updateQuantity(user, itemId, dto.quantity);
  }

  @Delete('items/:itemId')
  removeItem(@AuthUser() user: AuthenticatedUser, @Param('itemId', ParseUUIDPipe) itemId: string) {
    return this.cart.removeItem(user, itemId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  clear(@AuthUser() user: AuthenticatedUser) {
    return this.cart.clear(user);
  }

  /** Перенос корзины гостя после входа. Неподходящие позиции — в skipped. */
  @Post('merge')
  @HttpCode(HttpStatus.OK)
  merge(@AuthUser() user: AuthenticatedUser, @Body() dto: MergeCartDto) {
    return this.cart.merge(user, dto);
  }
}
