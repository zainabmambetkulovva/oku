import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BooksService {
  constructor(private prisma: PrismaService) {}

  async findAll(page: number = 1, limit: number = 10, categoryId?: string) {
    const skip = (page - 1) * limit;

    const where: Prisma.BookWhereInput = { status: 'ACTIVE' };

    if (categoryId) {
      where.bookCategories = { some: { categoryId } };
    }

    const books = await this.prisma.book.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        bookImages: true,
        bookCategories: { include: { category: true } },
      },
    });

    const total = await this.prisma.book.count({ where });
    const totalPages = Math.ceil(total / limit);

    return {
      data: books,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async findOne(slug: string) {
    const book = await this.prisma.book.findUnique({
      where: { slug },
      include: {
        bookImages: true,
        bookCategories: { include: { category: true } },
      },
    });

    if (!book) {
      throw new NotFoundException(`Book with slug "${slug}" not found`);
    }

    return book;
  }

  async incrementStockQuantity(bookId: string, quantity: number) {
    await this.prisma.book.update({
      where: { id: bookId },
      data: {
        stockQuantity: { increment: quantity },
      },
    });
  }

  async decrementStockQuantity(bookId: string, quantity: number) {
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      select: { stockQuantity: true },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    if (book.stockQuantity - quantity < 0) {
      throw new BadRequestException('Not enough stock');
    }

    await this.prisma.book.update({
      where: { id: bookId },
      data: {
        stockQuantity: { decrement: quantity },
      },
    });
  }
}
