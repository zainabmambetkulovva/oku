import { createAdmin, bearer, createTestApp, resetState, TestApp } from '../helpers/app';
import { seedCatalog } from '../helpers/catalog-fixtures';

describe('Public catalog (e2e)', () => {
  let t: TestApp;
  let catalog: Awaited<ReturnType<typeof seedCatalog>>;

  const slugs = (body: { data: Array<{ slug: string }> }) => body.data.map((item) => item.slug);
  const books = async (query = '') =>
    (
      await t
        .http()
        .get(`/api/v1/books${encodeURI(query)}`)
        .expect(200)
    ).body;

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetState(t);
    catalog = await seedCatalog(t.prisma);
  });

  afterAll(async () => {
    await t?.app.close();
  });

  describe('GET /books', () => {
    it('lists only published books, newest first, with pagination meta', async () => {
      const body = await books();

      expect(slugs(body)).toEqual(['clean-code', 'white-ship', 'jamila']);
      expect(body.meta).toEqual({ total: 3, page: 1, limit: 20, totalPages: 1 });
    });

    it('returns list items with prices in tyiyn and without inactive categories', async () => {
      const body = await books('?search=джамиля');

      expect(body.data[0]).toEqual({
        id: catalog.jamila.id,
        slug: 'jamila',
        title: 'Джамиля',
        author: 'Чингиз Айтматов',
        coverUrl: null,
        language: 'ru',
        price: 65_000,
        currency: 'KGS',
        inStock: true,
        stockQuantity: 10,
        categories: [{ id: catalog.classics.id, name: 'Классика', slug: 'classics' }],
        rating: { average: null, count: 0 },
        createdAt: expect.any(String),
      });
    });

    it('paginates', async () => {
      const body = await books('?limit=2&page=2');
      expect(slugs(body)).toEqual(['jamila']);
      expect(body.meta).toEqual({ total: 3, page: 2, limit: 2, totalPages: 2 });
    });

    it('validates pagination parameters', async () => {
      await t.http().get('/api/v1/books?limit=51').expect(400);
      await t.http().get('/api/v1/books?page=0').expect(400);
      await t.http().get('/api/v1/books?page=abc').expect(400);
    });

    it('searches by part of the title or author, case-insensitively', async () => {
      expect(slugs(await books('?search=ПАРОХ'))).toEqual(['white-ship']);
      expect(slugs(await books('?search=айтмат'))).toEqual(['white-ship', 'jamila']);
      expect(slugs(await books('?search=martin'))).toEqual(['clean-code']);
    });

    it('filters by category including subcategories', async () => {
      expect(slugs(await books('?category=fiction'))).toEqual(['white-ship', 'jamila']);
      expect(slugs(await books('?category=classics'))).toEqual(['white-ship', 'jamila']);
      expect(slugs(await books('?category=non-fiction'))).toEqual(['clean-code']);
      expect((await books('?category=unknown')).data).toEqual([]);
      expect((await books('?category=hidden')).data).toEqual([]);
    });

    it('filters by price, language and availability', async () => {
      expect(slugs(await books('?minPrice=70000&maxPrice=100000'))).toEqual(['white-ship']);
      expect(slugs(await books('?language=en'))).toEqual(['clean-code']);
      expect(slugs(await books('?inStock=true'))).toEqual(['clean-code', 'jamila']);
      expect(slugs(await books('?inStock=false'))).toEqual(['white-ship']);
    });

    it('validates filters', async () => {
      await t.http().get('/api/v1/books?minPrice=100&maxPrice=50').expect(400);
      await t.http().get('/api/v1/books?language=fr').expect(400);
      await t.http().get('/api/v1/books?inStock=yes').expect(400);
      await t.http().get('/api/v1/books?sort=cheapest').expect(400);
      await t.http().get('/api/v1/books?unknown=1').expect(400);
    });

    it('sorts by popularity, price and title', async () => {
      expect(slugs(await books('?sort=popular'))).toEqual(['white-ship', 'jamila', 'clean-code']);
      expect(slugs(await books('?sort=price_asc'))).toEqual(['jamila', 'white-ship', 'clean-code']);
      expect(slugs(await books('?sort=price_desc'))).toEqual([
        'clean-code',
        'white-ship',
        'jamila',
      ]);
      expect(slugs(await books('?sort=title'))).toEqual(['clean-code', 'white-ship', 'jamila']);
    });
  });

  describe('GET /books/:slug', () => {
    it('returns book details', async () => {
      const response = await t.http().get('/api/v1/books/jamila').expect(200);

      expect(response.body.data).toMatchObject({
        slug: 'jamila',
        description: 'Описание: Джамиля',
        publisher: 'Демо',
        price: 65_000,
        images: [],
      });
      expect(response.body.data).not.toHaveProperty('status');
      expect(response.body.data).not.toHaveProperty('salesCount');
    });

    it('hides drafts, archived and unknown books', async () => {
      await t.http().get('/api/v1/books/draft-book').expect(404);
      await t.http().get('/api/v1/books/archived-book').expect(404);
      await t.http().get('/api/v1/books/nope').expect(404);
    });

    it('suggests similar published books', async () => {
      const response = await t.http().get('/api/v1/books/jamila/similar').expect(200);
      expect(response.body.data.map((b: { slug: string }) => b.slug)).toEqual(['white-ship']);
    });
  });

  describe('categories', () => {
    it('returns the tree of active categories with product counts', async () => {
      const response = await t.http().get('/api/v1/categories').expect(200);

      expect(response.body.data).toEqual([
        expect.objectContaining({
          slug: 'fiction',
          booksCount: 0,
          children: [
            expect.objectContaining({
              slug: 'classics',
              booksCount: 2,
              audiobooksCount: 1,
              children: [],
            }),
          ],
        }),
        expect.objectContaining({ slug: 'non-fiction', booksCount: 1, children: [] }),
      ]);
    });

    it('returns a category with its parent', async () => {
      const response = await t.http().get('/api/v1/categories/classics').expect(200);
      expect(response.body.data).toMatchObject({
        slug: 'classics',
        parent: { slug: 'fiction', children: [] },
      });

      await t.http().get('/api/v1/categories/hidden').expect(404);
    });
  });

  describe('audiobooks', () => {
    it('lists published audiobooks', async () => {
      const response = await t.http().get('/api/v1/audiobooks').expect(200);

      expect(response.body.data).toEqual([
        expect.objectContaining({
          slug: 'jamila-audio',
          narrator: 'Диктор',
          durationSeconds: 3000,
          chaptersCount: 2,
          hasFreePreview: true,
          price: 45_000,
        }),
      ]);
    });

    it('returns chapters without storage keys', async () => {
      const response = await t.http().get('/api/v1/audiobooks/jamila-audio').expect(200);

      expect(response.body.data.chapters).toEqual([
        expect.objectContaining({ chapterNumber: 1, title: 'Глава 1', isFreePreview: true }),
        expect.objectContaining({ chapterNumber: 2, title: 'Глава 2', isFreePreview: false }),
      ]);
      expect(JSON.stringify(response.body)).not.toContain('storageKey');
      expect(JSON.stringify(response.body)).not.toContain('.mp3');

      await t.http().get('/api/v1/audiobooks/draft-audio').expect(404);
    });

    it('filters audiobooks by category', async () => {
      const fiction = await t.http().get('/api/v1/audiobooks?category=fiction').expect(200);
      expect(fiction.body.data).toHaveLength(1);
      const nonFiction = await t.http().get('/api/v1/audiobooks?category=non-fiction').expect(200);
      expect(nonFiction.body.data).toHaveLength(0);
    });
  });

  describe('cache', () => {
    it('serves cached data and refreshes it after a change in the admin panel', async () => {
      await books();

      // Изменение в обход админки кэш не сбрасывает — ответ остаётся прежним
      await t.prisma.book.update({ where: { id: catalog.jamila.id }, data: { price: 1 } });
      const cached = await books();
      expect(cached.data.find((b: { slug: string }) => b.slug === 'jamila').price).toBe(65_000);

      // Изменение через админку сбрасывает кэш
      const admin = await createAdmin(t);
      await t
        .http()
        .patch(`/api/v1/admin/books/${catalog.jamila.id}`)
        .set(bearer(admin.accessToken))
        .send({ price: 70_000 })
        .expect(200);

      const fresh = await books();
      expect(fresh.data.find((b: { slug: string }) => b.slug === 'jamila').price).toBe(70_000);
    });
  });
});
