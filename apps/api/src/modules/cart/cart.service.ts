import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getCart(userId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { book: true, audiobook: true } } },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: { items: { include: { book: true, audiobook: true } } },
      });
    }

    return cart;
  }

  async addItem(
    userId: string,
    bookId?: string,
    audiobookId?: string,
    quantity: number = 1,
  ) {
    if (!bookId && !audiobookId) {
      throw new Error('Either bookId or audiobookId must be provided');
    }

    if (bookId && audiobookId) {
      throw new Error('Cannot add both book and audiobook to cart');
    }

    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({ data: { userId }, include: { items: true } });
    }

    // Check if item already exists
    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        OR: [{ bookId }, { audiobookId }],
      },
    });

    if (existingItem) {
      return this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: { increment: quantity } },
        include: { book: true, audiobook: true },
      });
    }

    return this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        bookId,
        audiobookId,
        quantity,
      },
      include: { book: true, audiobook: true },
    });
  }

  async removeItem(cartId: string, itemId: string) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId, cartId },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    return this.prisma.cartItem.delete({ where: { id: itemId } });
  }

  async updateQuantity(cartId: string, itemId: string, quantity: number) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId, cartId },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
      include: { book: true, audiobook: true },
    });
  }
}
