import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async createOrder(userId: string, data: any) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { book: true, audiobook: true } } },
    });

    if (!cart || cart.items.length === 0) {
      throw new NotFoundException('Cart is empty');
    }

    // Calculate totals
    let subtotal = 0;
    for (const item of cart.items) {
      if (item.bookId) {
        subtotal += item.book.price * item.quantity;
      } else if (item.audiobookId) {
        subtotal += item.audiobook.price * item.quantity;
      }
    }

    const deliveryPrice = data.deliveryMethod === 'COURIER' ? 300 : 0;
    const total = subtotal + deliveryPrice - data.discount;

    // Create order
    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId,
          orderNumber: `ORD-${Date.now()}`,
          status: 'PENDING',
          subtotal,
          deliveryPrice,
          discount: data.discount || 0,
          total,
          currency: 'KGS',
          recipientName: data.recipientName,
          recipientPhone: data.recipientPhone,
          deliveryAddress: data.deliveryAddress || '',
          deliveryMethod: data.deliveryMethod || 'COURIER',
          paymentMethod: data.paymentMethod || 'ONLINE',
          comment: data.comment,
        },
        include: { items: true },
      });

      // Create order items
      for (const item of cart.items) {
        const productTitle = item.bookId ? item.book.title : item.audiobook.title;
        const productAuthor = item.bookId ? item.book.author : item.audiobook.author;
        const productCoverKey = item.bookId ? item.book.coverKey : item.audiobook.coverKey;
        const unitPrice = item.bookId ? item.book.price : item.audiobook.price;

        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            bookId: item.bookId,
            audiobookId: item.audiobookId,
            productTitle,
            productAuthor,
            productCoverKey,
            quantity: item.quantity,
            unitPrice,
            totalPrice: unitPrice * item.quantity,
          },
        });
      }

      // Update stock
      for (const item of cart.items) {
        if (item.bookId) {
          await tx.book.update({
            where: { id: item.bookId },
            data: { stockQuantity: { decrement: item.quantity } },
          });
        }
      }

      // Clear cart
      await tx.cart.delete({ where: { userId } });

      return newOrder;
    });

    return order;
  }

  async getUserOrders(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const orders = await this.prisma.order.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { items: true, payments: true },
    });

    const total = await this.prisma.order.count({ where: { userId } });
    const totalPages = Math.ceil(total / limit);

    return {
      data: orders,
      meta: { total, page, limit, totalPages },
    };
  }

  async findOne(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payments: true,
        statusHistory: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found`);
    }

    return order;
  }
}
