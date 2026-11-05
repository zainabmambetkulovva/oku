import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Category, Prisma } from '@prisma/client';
import { rejectNulls } from '../../common/utils/reject-nulls';
import { uniqueSlug } from '../../common/utils/slug';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CacheService } from '../cache/cache.service';
import { CATALOG_CACHE_TTL_SECONDS } from '../catalog/catalog.constants';
import { StorageService } from '../storage/storage.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  booksCount: number;
  audiobooksCount: number;
  children: CategoryNode[];
}

export interface AdminActor {
  id: string;
  ip?: string;
}

type Db = PrismaService | Prisma.TransactionClient;

const activeProducts = { where: { status: 'ACTIVE' as const, deletedAt: null } };

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  // ─── Публичная часть ───────────────────────────────────────────────────────

  /** Дерево активных категорий с количеством опубликованных товаров. */
  tree(): Promise<CategoryNode[]> {
    return this.cache.catalog('categories:tree', CATALOG_CACHE_TTL_SECONDS, async () => {
      const categories = await this.prisma.category.findMany({
        where: { isActive: true, deletedAt: null },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          _count: {
            select: {
              bookCategories: { where: { book: activeProducts.where } },
              audiobookCategories: { where: { audiobook: activeProducts.where } },
            },
          },
        },
      });

      const nodes = new Map<string, CategoryNode>();
      for (const category of categories) {
        nodes.set(category.id, {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          imageUrl: this.storage.publicUrl(category.imageKey),
          sortOrder: category.sortOrder,
          booksCount: category._count.bookCategories,
          audiobooksCount: category._count.audiobookCategories,
          children: [],
        });
      }

      const roots: CategoryNode[] = [];
      for (const category of categories) {
        const node = nodes.get(category.id)!;
        if (!category.parentId) {
          roots.push(node);
          continue;
        }
        // Подкатегория скрытого родителя не показывается
        nodes.get(category.parentId)?.children.push(node);
      }
      return roots;
    });
  }

  async findBySlug(slug: string): Promise<CategoryNode & { parent: CategoryNode | null }> {
    const tree = await this.tree();
    const path = findPath(tree, slug);
    if (!path) {
      throw new NotFoundException(`Category "${slug}" not found`);
    }
    const node = path[path.length - 1];
    const parent = path.length > 1 ? { ...path[path.length - 2], children: [] } : null;
    return { ...node, parent };
  }

  /**
   * id категории и всех её активных подкатегорий — для фильтра каталога.
   * Пустой список, если категории нет.
   */
  async idsWithDescendants(slug: string): Promise<string[]> {
    const path = findPath(await this.tree(), slug);
    if (!path) {
      return [];
    }
    const ids: string[] = [];
    const walk = (node: CategoryNode) => {
      ids.push(node.id);
      node.children.forEach(walk);
    };
    walk(path[path.length - 1]);
    return ids;
  }

  /** Проверяет, что все категории существуют (для привязки товаров). */
  async assertExist(ids: string[], db: Db = this.prisma): Promise<void> {
    const unique = [...new Set(ids)];
    const found = await db.category.count({ where: { id: { in: unique }, deletedAt: null } });
    if (found !== unique.length) {
      throw new BadRequestException('Some categories do not exist');
    }
  }

  // ─── Администрирование ─────────────────────────────────────────────────────

  async adminList() {
    const categories = await this.prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { children: true, bookCategories: true, audiobookCategories: true } },
      },
    });
    return categories.map(({ _count, ...category }) => ({
      ...category,
      imageUrl: this.storage.publicUrl(category.imageKey),
      childrenCount: _count.children,
      booksCount: _count.bookCategories,
      audiobooksCount: _count.audiobookCategories,
    }));
  }

  async create(dto: CreateCategoryDto, actor: AdminActor): Promise<Category> {
    if (dto.parentId) {
      await this.findById(dto.parentId);
    }
    if (dto.imageKey) {
      await this.storage.assertUploaded(dto.imageKey, 'category-image');
    }

    const slug = dto.slug ?? (await uniqueSlug(dto.name, (s) => this.slugTaken(s)));
    const category = await this.withSlugConflict(() =>
      this.prisma.category.create({ data: { ...dto, slug } }),
    );

    await this.afterWrite('category.create', category.id, actor, undefined, category);
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto, actor: AdminActor): Promise<Category> {
    rejectNulls(dto, ['name', 'slug', 'isActive', 'sortOrder']);
    const before = await this.findById(id);

    if (dto.parentId) {
      await this.assertNotDescendant(id, dto.parentId);
    }
    if (dto.imageKey && dto.imageKey !== before.imageKey) {
      await this.storage.assertUploaded(dto.imageKey, 'category-image');
    }

    const category = await this.withSlugConflict(() =>
      this.prisma.category.update({
        where: { id },
        data: { ...dto, name: dto.name ?? undefined, slug: dto.slug ?? undefined },
      }),
    );

    await this.afterWrite('category.update', id, actor, before, category);
    return category;
  }

  /** Удаление только пустой категории: без подкатегорий и товаров. */
  async remove(id: string, actor: AdminActor): Promise<void> {
    const category = await this.prisma.category.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: { select: { children: true, bookCategories: true, audiobookCategories: true } },
      },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const { children, bookCategories: books, audiobookCategories: audiobooks } = category._count;
    if (children > 0 || books > 0 || audiobooks > 0) {
      throw new ConflictException({
        message: 'Category is not empty: move or delete its subcategories and products first',
        details: { children, books, audiobooks },
      });
    }

    const { _count, ...snapshot } = category;
    await this.prisma.category.delete({ where: { id } });
    await this.afterWrite('category.delete', id, actor, snapshot, undefined);
  }

  private async findById(id: string): Promise<Category> {
    const category = await this.prisma.category.findFirst({ where: { id, deletedAt: null } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  /** Новый родитель не может быть самой категорией или её потомком (цикл). */
  private async assertNotDescendant(id: string, newParentId: string): Promise<void> {
    let current: string | null = newParentId;
    const visited = new Set<string>();
    while (current) {
      if (current === id) {
        throw new BadRequestException('Category cannot be moved inside itself');
      }
      if (visited.has(current)) {
        break;
      }
      visited.add(current);
      const parent: Pick<Category, 'parentId'> | null = await this.prisma.category.findFirst({
        where: { id: current, deletedAt: null },
        select: { parentId: true },
      });
      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }
      current = parent.parentId;
    }
  }

  private async slugTaken(slug: string): Promise<boolean> {
    return (await this.prisma.category.count({ where: { slug } })) > 0;
  }

  private async withSlugConflict<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Category with this slug already exists');
      }
      throw error;
    }
  }

  private async afterWrite(
    action: string,
    entityId: string,
    actor: AdminActor,
    oldData: unknown,
    newData: unknown,
  ): Promise<void> {
    await this.audit.log({
      actorId: actor.id,
      action,
      entityType: 'category',
      entityId,
      oldData,
      newData,
      ipAddress: actor.ip,
    });
    await this.cache.invalidateCatalog();
  }
}

function findPath(nodes: CategoryNode[], slug: string): CategoryNode[] | undefined {
  for (const node of nodes) {
    if (node.slug === slug) {
      return [node];
    }
    const sub = findPath(node.children, slug);
    if (sub) {
      return [node, ...sub];
    }
  }
  return undefined;
}
