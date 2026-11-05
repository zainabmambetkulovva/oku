import {
  bearer,
  createAdmin,
  createTestApp,
  postToStorage,
  registerUser,
  RegisteredUser,
  resetState,
  TestApp,
  uploadFile,
} from '../helpers/app';

describe('Admin catalog (e2e)', () => {
  let t: TestApp;
  let admin: RegisteredUser;

  const as = (user: RegisteredUser) => ({
    get: (url: string) => t.http().get(`/api/v1${url}`).set(bearer(user.accessToken)),
    post: (url: string, body?: object) =>
      t.http().post(`/api/v1${url}`).set(bearer(user.accessToken)).send(body),
    put: (url: string, body?: object) =>
      t.http().put(`/api/v1${url}`).set(bearer(user.accessToken)).send(body),
    patch: (url: string, body?: object) =>
      t.http().patch(`/api/v1${url}`).set(bearer(user.accessToken)).send(body),
    delete: (url: string) => t.http().delete(`/api/v1${url}`).set(bearer(user.accessToken)),
  });

  const audit = (action: string) =>
    t.prisma.auditLog.findMany({ where: { action }, orderBy: { createdAt: 'asc' } });

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetState(t);
    admin = await createAdmin(t);
  });

  afterAll(async () => {
    await t?.app.close();
  });

  describe('access', () => {
    it('is closed for guests and regular users', async () => {
      const user = await registerUser(t);

      for (const url of ['/admin/books', '/admin/audiobooks', '/admin/categories']) {
        await t.http().get(`/api/v1${url}`).expect(401);
        await as(user).get(url).expect(403);
        await as(admin).get(url).expect(200);
      }
      await as(user)
        .post('/admin/uploads', { kind: 'book-cover', contentType: 'image/png', size: 10 })
        .expect(403);
    });
  });

  describe('categories', () => {
    it('creates categories with transliterated slugs and logs the action', async () => {
      const root = await as(admin)
        .post('/admin/categories', { name: 'Детская литература' })
        .expect(201);
      expect(root.body.data).toMatchObject({ slug: 'detskaya-literatura', isActive: true });

      const duplicate = await as(admin)
        .post('/admin/categories', { name: 'Детская литература' })
        .expect(201);
      expect(duplicate.body.data.slug).toBe('detskaya-literatura-2');

      await as(admin)
        .post('/admin/categories', { name: 'X', slug: 'detskaya-literatura' })
        .expect(409);

      const [entry] = await audit('category.create');
      expect(entry).toMatchObject({ userId: admin.id, entityId: root.body.data.id });
    });

    it('prevents cycles in the category tree', async () => {
      const parent = (await as(admin).post('/admin/categories', { name: 'A' }).expect(201)).body
        .data;
      const child = (
        await as(admin).post('/admin/categories', { name: 'B', parentId: parent.id }).expect(201)
      ).body.data;

      await as(admin).patch(`/admin/categories/${parent.id}`, { parentId: child.id }).expect(400);
      await as(admin).patch(`/admin/categories/${parent.id}`, { parentId: parent.id }).expect(400);
    });

    it('deletes only empty categories', async () => {
      const parent = (await as(admin).post('/admin/categories', { name: 'A' }).expect(201)).body
        .data;
      await as(admin).post('/admin/categories', { name: 'B', parentId: parent.id }).expect(201);
      await as(admin)
        .post('/admin/books', {
          title: 'Книга',
          author: 'Автор',
          price: 1000,
          categoryIds: [parent.id],
        })
        .expect(201);

      const response = await as(admin).delete(`/admin/categories/${parent.id}`).expect(409);
      expect(response.body.details).toEqual({ children: 1, books: 1, audiobooks: 0 });

      const empty = (await as(admin).post('/admin/categories', { name: 'C' }).expect(201)).body
        .data;
      await as(admin).delete(`/admin/categories/${empty.id}`).expect(204);
      expect(await audit('category.delete')).toHaveLength(1);
    });

    it('hides inactive categories from the public tree', async () => {
      const category = (await as(admin).post('/admin/categories', { name: 'A' }).expect(201)).body
        .data;
      await as(admin).patch(`/admin/categories/${category.id}`, { isActive: false }).expect(200);

      const tree = await t.http().get('/api/v1/categories').expect(200);
      expect(tree.body.data).toEqual([]);
    });
  });

  describe('uploads', () => {
    it('issues upload forms only for allowed types and sizes', async () => {
      await as(admin)
        .post('/admin/uploads', { kind: 'book-cover', contentType: 'image/svg+xml', size: 10 })
        .expect(400);
      await as(admin)
        .post('/admin/uploads', {
          kind: 'book-cover',
          contentType: 'image/png',
          size: 6 * 1024 * 1024,
        })
        .expect(400);
      await as(admin)
        .post('/admin/uploads', { kind: 'audio-chapter', contentType: 'image/png', size: 10 })
        .expect(400);

      const response = await as(admin)
        .post('/admin/uploads', { kind: 'book-cover', contentType: 'image/webp', size: 1000 })
        .expect(201);
      expect(response.body.data).toMatchObject({
        url: expect.any(String),
        fields: expect.objectContaining({ 'Content-Type': 'image/webp' }),
        key: expect.stringMatching(/^books\/covers\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.webp$/),
        maxBytes: 1000,
      });
    });

    it('storage rejects files larger than declared or of another type', async () => {
      const response = await as(admin)
        .post('/admin/uploads', { kind: 'book-cover', contentType: 'image/png', size: 100 })
        .expect(201);
      const { url, fields } = response.body.data;

      expect(await postToStorage(url, fields, 'image/png', 500)).toBeGreaterThanOrEqual(400);
      expect(
        await postToStorage(url, { ...fields, 'Content-Type': 'text/html' }, 'text/html', 50),
      ).toBeGreaterThanOrEqual(400);
      expect(await postToStorage(url, fields, 'image/png', 100)).toBeLessThan(300);
    });
  });

  describe('books', () => {
    it('creates a draft with a cover, publishes it and shows it publicly', async () => {
      const coverKey = await uploadFile(t, admin.accessToken, 'book-cover');
      const category = (await as(admin).post('/admin/categories', { name: 'Проза' }).expect(201))
        .body.data;

      const created = await as(admin)
        .post('/admin/books', {
          title: 'Белый пароход',
          author: 'Чингиз Айтматов',
          price: 65_000,
          stockQuantity: 4,
          language: 'ru',
          isbn: '978-5-17-090332-0',
          coverKey,
          categoryIds: [category.id],
        })
        .expect(201);

      const book = created.body.data;
      expect(book).toMatchObject({
        slug: 'belyi-parohod',
        status: 'DRAFT',
        price: 65_000,
        coverKey,
        categories: [{ id: category.id, name: 'Проза', slug: 'proza' }],
      });

      // Обложка доступна публично (публичный бакет, как через CDN)
      const cover = await fetch(book.coverUrl);
      expect(cover.status).toBe(200);

      await t.http().get('/api/v1/books/belyi-parohod').expect(404);
      await as(admin).patch(`/admin/books/${book.id}/status`, { status: 'ACTIVE' }).expect(200);
      const page = await t.http().get('/api/v1/books/belyi-parohod').expect(200);
      expect(page.body.data.coverUrl).toBe(book.coverUrl);
    });

    it('accepts only files that were really uploaded as the right kind', async () => {
      const body = { title: 'Книга', author: 'Автор', price: 1000 };

      await as(admin)
        .post('/admin/books', { ...body, coverKey: 'books/covers/2026/01/missing.png' })
        .expect(400);
      await as(admin)
        .post('/admin/books', { ...body, coverKey: '../secret.png' })
        .expect(400);

      const audioKey = await uploadFile(t, admin.accessToken, 'audio-chapter', {
        contentType: 'audio/mpeg',
      });
      const response = await as(admin)
        .post('/admin/books', { ...body, coverKey: audioKey })
        .expect(400);
      expect(response.body.message).toContain('was not uploaded as book-cover');
    });

    it('updates fields and records old and new values in the audit log', async () => {
      const book = (
        await as(admin)
          .post('/admin/books', { title: 'Книга', author: 'Автор', price: 1000 })
          .expect(201)
      ).body.data;

      const updated = await as(admin)
        .patch(`/admin/books/${book.id}`, { price: 2500, stockQuantity: 7, description: 'Текст' })
        .expect(200);
      expect(updated.body.data).toMatchObject({
        price: 2500,
        stockQuantity: 7,
        description: 'Текст',
      });

      const [entry] = await audit('book.update');
      expect(entry.oldData).toMatchObject({ price: 1000 });
      expect(entry.newData).toMatchObject({ price: 2500, stockQuantity: 7 });

      await as(admin).patch(`/admin/books/${book.id}`, { description: null }).expect(200);
      await as(admin).patch(`/admin/books/${book.id}`, { title: null }).expect(400);
      await as(admin).patch(`/admin/books/${book.id}`, { price: 0 }).expect(400);
      await as(admin).patch(`/admin/books/${book.id}`, { language: 'de' }).expect(400);
      await as(admin).patch(`/admin/books/${book.id}`, { salesCount: 1000 }).expect(400);
    });

    it('rejects duplicate ISBN and slug', async () => {
      const body = { author: 'Автор', price: 1000, isbn: '978-5-17-090332-0' };
      await as(admin)
        .post('/admin/books', { ...body, title: 'A', slug: 'a' })
        .expect(201);

      const isbn = await as(admin)
        .post('/admin/books', { ...body, title: 'B' })
        .expect(409);
      expect(isbn.body.message).toBe('Book with this ISBN already exists');
      await as(admin)
        .post('/admin/books', { title: 'C', author: 'X', price: 1, slug: 'a' })
        .expect(409);
    });

    it('cannot delete a book that has orders — only archive it', async () => {
      const book = (
        await as(admin)
          .post('/admin/books', { title: 'Книга', author: 'Автор', price: 1000 })
          .expect(201)
      ).body.data;
      await t.prisma.order.create({
        data: {
          userId: admin.id,
          orderNumber: 'ORD-1',
          subtotal: 1000,
          total: 1000,
          recipientName: 'R',
          recipientPhone: 'P',
          items: {
            create: {
              productType: 'BOOK',
              bookId: book.id,
              productTitle: 'Книга',
              productAuthor: 'Автор',
              quantity: 1,
              unitPrice: 1000,
              totalPrice: 1000,
            },
          },
        },
      });

      const response = await as(admin).delete(`/admin/books/${book.id}`).expect(409);
      expect(response.body.details).toEqual({ orderItems: 1 });
      await as(admin).patch(`/admin/books/${book.id}/status`, { status: 'ARCHIVED' }).expect(200);
    });

    it('deletes a book without orders', async () => {
      const book = (
        await as(admin)
          .post('/admin/books', { title: 'Книга', author: 'Автор', price: 1000 })
          .expect(201)
      ).body.data;
      await as(admin).delete(`/admin/books/${book.id}`).expect(204);
      await as(admin).get(`/admin/books/${book.id}`).expect(404);
    });

    it('manages additional images', async () => {
      const book = (
        await as(admin)
          .post('/admin/books', { title: 'Книга', author: 'Автор', price: 1000 })
          .expect(201)
      ).body.data;
      const storageKey = await uploadFile(t, admin.accessToken, 'book-image', {
        contentType: 'image/jpeg',
      });

      const image = await as(admin)
        .post(`/admin/books/${book.id}/images`, { storageKey, altText: 'Разворот' })
        .expect(201);
      expect(image.body.data).toMatchObject({ storageKey, altText: 'Разворот', sortOrder: 0 });

      const details = await as(admin).get(`/admin/books/${book.id}`).expect(200);
      expect(details.body.data.images).toHaveLength(1);

      await as(admin).delete(`/admin/books/${book.id}/images/${image.body.data.id}`).expect(204);
      await as(admin).delete(`/admin/books/${book.id}/images/${image.body.data.id}`).expect(404);
    });

    it('lists drafts and archived books in the admin panel', async () => {
      await as(admin)
        .post('/admin/books', { title: 'Черновик', author: 'A', price: 1 })
        .expect(201);
      const list = await as(admin).get('/admin/books?status=DRAFT').expect(200);
      expect(list.body.data).toHaveLength(1);
      expect(list.body.meta.total).toBe(1);
    });
  });

  describe('audiobooks and chapters', () => {
    const createAudiobook = async () =>
      (
        await as(admin)
          .post('/admin/audiobooks', { title: 'Джамиля', author: 'Чингиз Айтматов', price: 45_000 })
          .expect(201)
      ).body.data;

    const addChapter = async (audiobookId: string, title: string, durationSeconds: number) => {
      const storageKey = await uploadFile(t, admin.accessToken, 'audio-chapter', {
        contentType: 'audio/mpeg',
      });
      return (
        await as(admin)
          .post(`/admin/audiobooks/${audiobookId}/chapters`, { title, durationSeconds, storageKey })
          .expect(201)
      ).body.data;
    };

    it('requires chapters before publishing and sums their duration', async () => {
      const audiobook = await createAudiobook();
      expect(audiobook).toMatchObject({ status: 'DRAFT', durationSeconds: 0, chapters: [] });

      await as(admin)
        .patch(`/admin/audiobooks/${audiobook.id}/status`, { status: 'ACTIVE' })
        .expect(409);

      const first = await addChapter(audiobook.id, 'Глава 1', 600);
      const second = await addChapter(audiobook.id, 'Глава 2', 900);
      expect([first.chapterNumber, second.chapterNumber]).toEqual([1, 2]);

      const published = await as(admin)
        .patch(`/admin/audiobooks/${audiobook.id}/status`, { status: 'ACTIVE' })
        .expect(200);
      expect(published.body.data.durationSeconds).toBe(1500);

      const page = await t.http().get(`/api/v1/audiobooks/${audiobook.slug}`).expect(200);
      expect(page.body.data.chapters.map((c: { title: string }) => c.title)).toEqual([
        'Глава 1',
        'Глава 2',
      ]);
    });

    it('keeps audio files private', async () => {
      const storageKey = await uploadFile(t, admin.accessToken, 'audio-chapter', {
        contentType: 'audio/mpeg',
      });
      const privateUrl = `${process.env.S3_ENDPOINT}/${process.env.S3_PRIVATE_BUCKET}/${storageKey}`;
      const publicGuess = `${process.env.MEDIA_PUBLIC_BASE_URL}/${storageKey}`;

      expect((await fetch(privateUrl)).status).toBe(403);
      expect((await fetch(publicGuess)).status).toBeGreaterThanOrEqual(400);
    });

    it('reorders chapters', async () => {
      const audiobook = await createAudiobook();
      const a = await addChapter(audiobook.id, 'A', 60);
      const b = await addChapter(audiobook.id, 'B', 60);
      const c = await addChapter(audiobook.id, 'C', 60);

      const response = await as(admin)
        .put(`/admin/audiobooks/${audiobook.id}/chapters/order`, { chapterIds: [c.id, a.id, b.id] })
        .expect(200);
      expect(
        response.body.data.chapters.map((ch: { title: string; chapterNumber: number }) => [
          ch.chapterNumber,
          ch.title,
        ]),
      ).toEqual([
        [1, 'C'],
        [2, 'A'],
        [3, 'B'],
      ]);

      await as(admin)
        .put(`/admin/audiobooks/${audiobook.id}/chapters/order`, { chapterIds: [c.id, a.id] })
        .expect(400);
    });

    it('renumbers chapters and recalculates duration after deletion', async () => {
      const audiobook = await createAudiobook();
      await addChapter(audiobook.id, 'A', 100);
      const b = await addChapter(audiobook.id, 'B', 200);
      await addChapter(audiobook.id, 'C', 300);

      await as(admin).delete(`/admin/audiobooks/${audiobook.id}/chapters/${b.id}`).expect(204);

      const details = (await as(admin).get(`/admin/audiobooks/${audiobook.id}`).expect(200)).body
        .data;
      expect(details.durationSeconds).toBe(400);
      expect(
        details.chapters.map((ch: { chapterNumber: number; title: string }) => [
          ch.chapterNumber,
          ch.title,
        ]),
      ).toEqual([
        [1, 'A'],
        [2, 'C'],
      ]);
    });

    it('does not delete the last chapter of a published audiobook', async () => {
      const audiobook = await createAudiobook();
      const only = await addChapter(audiobook.id, 'Единственная', 100);
      await as(admin)
        .patch(`/admin/audiobooks/${audiobook.id}/status`, { status: 'ACTIVE' })
        .expect(200);

      await as(admin).delete(`/admin/audiobooks/${audiobook.id}/chapters/${only.id}`).expect(409);
    });

    it('updates a chapter and its free preview flag', async () => {
      const audiobook = await createAudiobook();
      const chapter = await addChapter(audiobook.id, 'Глава', 100);

      const updated = await as(admin)
        .patch(`/admin/audiobooks/${audiobook.id}/chapters/${chapter.id}`, {
          isFreePreview: true,
          durationSeconds: 250,
        })
        .expect(200);
      expect(updated.body.data).toMatchObject({ isFreePreview: true, durationSeconds: 250 });

      const details = (await as(admin).get(`/admin/audiobooks/${audiobook.id}`).expect(200)).body
        .data;
      expect(details.durationSeconds).toBe(250);
    });

    it('cannot delete an audiobook somebody has access to', async () => {
      const audiobook = await createAudiobook();
      await t.prisma.audioAccess.create({ data: { userId: admin.id, audiobookId: audiobook.id } });

      const response = await as(admin).delete(`/admin/audiobooks/${audiobook.id}`).expect(409);
      expect(response.body.details).toEqual({ orderItems: 0, accessGrants: 1 });
    });
  });
});
