import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(parentId?: string) {
    return this.prisma.category.findMany({
      where: parentId ? { parentId } : { parentId: null },
      orderBy: { sortOrder: 'asc' },
      include: { children: true, bookCategories: true, audiobookCategories: true },
    });
  }

  async findOne(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: { children: true, bookCategories: true, audiobookCategories: true },
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
        books: {
          where: { status: 'ACTIVE' },
          include: { bookImages: true },
        },
        audiobooks: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with slug "${slug}" not found`);
    }

    return category;
  }
}
