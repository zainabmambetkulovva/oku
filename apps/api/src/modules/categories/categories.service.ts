import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(parentId?: string) {
    return this.prisma.category.findMany({
      where: parentId ? { parentId } : { parentId: null },
      orderBy: { sortOrder: 'asc' },
      include: { bookCategories: true, audiobookCategories: true },
    });
  }

  async findOne(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: { bookCategories: true, audiobookCategories: true },
    });

    if (!category) {
      throw new NotFoundException(`Category with slug "${slug}" not found`);
    }

    return category;
  }

  async findWithBooks(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        bookCategories: {
          where: { book: { status: 'ACTIVE' } },
          include: { book: { include: { bookImages: true } } },
        },
        audiobookCategories: {
          where: { audiobook: { status: 'ACTIVE' } },
          include: { audiobook: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with slug "${slug}" not found`);
    }

    return category;
  }
}
