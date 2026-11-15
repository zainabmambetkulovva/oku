import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Quote } from '@prisma/client';
import { paginated, skipFor } from '../../common/pagination/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { SiteLocale } from '../auth/auth.constants';
import { AdminQuotesQueryDto, CreateQuoteDto, UpdateQuoteDto } from './dto/quotes.dto';

const BISHKEK_OFFSET_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Номер дня по времени Бишкека: цитата меняется в полночь по Бишкеку. */
export function bishkekDay(now = Date.now()): number {
  return Math.floor((now + BISHKEK_OFFSET_MS) / DAY_MS);
}

interface AdminActor {
  id: string;
  ip?: string;
}

const quoteInclude = {
  book: { select: { slug: true, title: true, status: true, deletedAt: true } },
};

/** Цитаты дня: текст, автор и язык задаёт администратор, на главной — одна цитата в день. */
@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Цитата на сегодня для языка страницы. Если на этом языке цитат нет — берётся
   * цитата на другом языке; если цитат нет вообще — null (блок не показывается).
   */
  async today(locale: SiteLocale = 'ru', now = Date.now()) {
    let quotes = await this.active(locale);
    if (quotes.length === 0) quotes = await this.active();
    if (quotes.length === 0) return null;
    const quote = quotes[bishkekDay(now) % quotes.length];
    const book =
      quote.book && quote.book.status === 'ACTIVE' && !quote.book.deletedAt
        ? { slug: quote.book.slug, title: quote.book.title }
        : null;
    return {
      id: quote.id,
      text: quote.text,
      author: quote.author,
      source: quote.source,
      locale: quote.locale,
      book,
    };
  }

  private active(locale?: SiteLocale) {
    return this.prisma.quote.findMany({
      where: { isActive: true, ...(locale && { locale }) },
      include: quoteInclude,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  async adminList(query: AdminQuotesQueryDto) {
    const where: Prisma.QuoteWhereInput = {
      ...(query.locale && { locale: query.locale }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.quote.findMany({
        where,
        include: quoteInclude,
        orderBy: { createdAt: 'desc' },
        skip: skipFor(query),
        take: query.limit,
      }),
      this.prisma.quote.count({ where }),
    ]);
    return paginated(items.map(toAdmin), total, query);
  }

  async create(dto: CreateQuoteDto, actor: AdminActor) {
    await this.assertBook(dto.bookId);
    const quote = await this.prisma.quote.create({ data: dto, include: quoteInclude });
    await this.log('quote.create', quote.id, actor, undefined, quote);
    return toAdmin(quote);
  }

  async update(id: string, dto: UpdateQuoteDto, actor: AdminActor) {
    const before = await this.find(id);
    await this.assertBook(dto.bookId);
    const quote = await this.prisma.quote.update({
      where: { id },
      data: dto,
      include: quoteInclude,
    });
    await this.log('quote.update', id, actor, before, quote);
    return toAdmin(quote);
  }

  async remove(id: string, actor: AdminActor): Promise<void> {
    const before = await this.find(id);
    await this.prisma.quote.delete({ where: { id } });
    await this.log('quote.delete', id, actor, before, undefined);
  }

  private async find(id: string): Promise<Quote> {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote) throw new NotFoundException('Quote not found');
    return quote;
  }

  private async assertBook(bookId?: string) {
    if (bookId && !(await this.prisma.book.findUnique({ where: { id: bookId } }))) {
      throw new NotFoundException('Book not found');
    }
  }

  private log(
    action: string,
    entityId: string,
    actor: AdminActor,
    oldData: unknown,
    newData: unknown,
  ) {
    return this.audit.log({
      actorId: actor.id,
      action,
      entityType: 'quote',
      entityId,
      oldData,
      newData,
      ipAddress: actor.ip,
    });
  }
}

function toAdmin(quote: Quote & { book: { slug: string; title: string } | null }) {
  return {
    id: quote.id,
    text: quote.text,
    author: quote.author,
    source: quote.source,
    bookId: quote.bookId,
    book: quote.book && { slug: quote.book.slug, title: quote.book.title },
    locale: quote.locale,
    isActive: quote.isActive,
    createdAt: quote.createdAt,
    updatedAt: quote.updatedAt,
  };
}
