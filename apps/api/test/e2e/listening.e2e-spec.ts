import {
  bearer,
  createAdmin,
  createTestApp,
  registerUser,
  RegisteredUser,
  resetState,
  TestApp,
  uploadFile,
} from '../helpers/app';

interface TestAudiobook {
  id: string;
  slug: string;
  freeChapterId: string;
  paidChapterId: string;
}

describe('Listening (e2e)', () => {
  let t: TestApp;
  let admin: RegisteredUser;
  let user: RegisteredUser;
  let book: TestAudiobook;

  const api = (path: string) => `/api/v1${path}`;
  const stream = (b: TestAudiobook, chapterId: string, token?: string) => {
    const request = t.http().get(api(`/audiobooks/${b.slug}/chapters/${chapterId}/stream`));
    return token ? request.set(bearer(token)) : request;
  };
  const grant = (b: TestAudiobook, email: string, expiresAt?: string) =>
    t
      .http()
      .post(api(`/admin/audiobooks/${b.id}/access`))
      .set(bearer(admin.accessToken))
      .send({ email, expiresAt });

  /** Аудиокнига через админку: бесплатная глава 1 (100 байт) и платная глава 2 (200 байт). */
  async function createAudiobook(title: string, price: number): Promise<TestAudiobook> {
    const audiobook = (
      await t
        .http()
        .post(api('/admin/audiobooks'))
        .set(bearer(admin.accessToken))
        .send({ title, author: 'Чингиз Айтматов', price })
        .expect(201)
    ).body.data;

    const chapters = [];
    for (const [index, bytes] of [100, 200].entries()) {
      const storageKey = await uploadFile(t, admin.accessToken, 'audio-chapter', {
        contentType: 'audio/mpeg',
        bytes,
      });
      chapters.push(
        (
          await t
            .http()
            .post(api(`/admin/audiobooks/${audiobook.id}/chapters`))
            .set(bearer(admin.accessToken))
            .send({
              title: `Глава ${index + 1}`,
              durationSeconds: 600,
              storageKey,
              isFreePreview: index === 0,
            })
            .expect(201)
        ).body.data,
      );
    }

    await t
      .http()
      .patch(api(`/admin/audiobooks/${audiobook.id}/status`))
      .set(bearer(admin.accessToken))
      .send({ status: 'ACTIVE' })
      .expect(200);

    return {
      id: audiobook.id,
      slug: audiobook.slug,
      freeChapterId: chapters[0].id,
      paidChapterId: chapters[1].id,
    };
  }

  beforeAll(async () => {
    t = await createTestApp();
  });

  beforeEach(async () => {
    await resetState(t);
    admin = await createAdmin(t);
    user = await registerUser(t);
    book = await createAudiobook('Джамиля', 45_000);
  });

  afterAll(async () => {
    await t?.app.close();
  });

  describe('streaming', () => {
    it('gives guests a working link to the free chapter', async () => {
      const response = await stream(book, book.freeChapterId).expect(200);

      expect(response.body.data).toMatchObject({
        url: expect.stringContaining('X-Amz-Signature='),
        expiresAt: expect.any(String),
        chapter: { id: book.freeChapterId, chapterNumber: 1, title: 'Глава 1' },
      });
      expect(new Date(response.body.data.expiresAt).getTime()).toBeGreaterThan(Date.now());

      const file = await fetch(response.body.data.url);
      expect(file.status).toBe(200);
      expect((await file.arrayBuffer()).byteLength).toBe(100);
    });

    it('asks guests to sign in for paid chapters', async () => {
      const response = await stream(book, book.paidChapterId).expect(401);
      expect(response.body.message).toBe('Sign in to listen to this chapter');
    });

    it('asks users without access to purchase', async () => {
      const response = await stream(book, book.paidChapterId, user.accessToken).expect(403);
      expect(response.body.message).toBe('Purchase the audiobook to listen to this chapter');
    });

    it('streams paid chapters to users with access', async () => {
      await grant(book, user.email).expect(201);

      const response = await stream(book, book.paidChapterId, user.accessToken).expect(200);
      const file = await fetch(response.body.data.url);
      expect(file.status).toBe(200);
      expect((await file.arrayBuffer()).byteLength).toBe(200);
    });

    it('stops streaming when access is revoked or expired', async () => {
      await grant(book, user.email).expect(201);
      await t
        .http()
        .delete(api(`/admin/audiobooks/${book.id}/access/${user.id}`))
        .set(bearer(admin.accessToken))
        .expect(204);
      await stream(book, book.paidChapterId, user.accessToken).expect(403);

      await grant(book, user.email).expect(201);
      await stream(book, book.paidChapterId, user.accessToken).expect(200);
      await t.prisma.audioAccess.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
      await stream(book, book.paidChapterId, user.accessToken).expect(403);
    });

    it('keeps access for buyers after the audiobook is archived', async () => {
      await grant(book, user.email).expect(201);
      await t
        .http()
        .patch(api(`/admin/audiobooks/${book.id}/status`))
        .set(bearer(admin.accessToken))
        .send({ status: 'ARCHIVED' })
        .expect(200);

      await stream(book, book.paidChapterId, user.accessToken).expect(200);
      await stream(book, book.freeChapterId).expect(404);
      await t
        .http()
        .get(api(`/audiobooks/${book.slug}`))
        .expect(404);
    });

    it('hides drafts from everyone except administrators', async () => {
      await t
        .http()
        .patch(api(`/admin/audiobooks/${book.id}/status`))
        .set(bearer(admin.accessToken))
        .send({ status: 'DRAFT' })
        .expect(200);

      await stream(book, book.freeChapterId).expect(404);
      await stream(book, book.freeChapterId, user.accessToken).expect(404);
      await stream(book, book.paidChapterId, admin.accessToken).expect(200);
    });

    it('rejects chapters of another audiobook and invalid tokens', async () => {
      const other = await createAudiobook('Белый пароход', 45_000);

      await stream(book, other.freeChapterId).expect(404);
      await stream(book, book.freeChapterId, 'garbage').expect(401);
    });
  });

  describe('free audiobooks', () => {
    it('are fully available after registration, guests get free chapters only', async () => {
      const free = await createAudiobook('Бесплатная', 0);

      await stream(free, free.freeChapterId).expect(200);
      await stream(free, free.paidChapterId).expect(401);
      await stream(free, free.paidChapterId, user.accessToken).expect(200);

      const access = await t
        .http()
        .get(api(`/audiobooks/${free.slug}/access`))
        .set(bearer(user.accessToken))
        .expect(200);
      expect(access.body.data).toMatchObject({ hasFullAccess: true, reason: 'free' });
    });
  });

  describe('access info', () => {
    it('describes what a guest, a user and a buyer can listen to', async () => {
      const guest = await t
        .http()
        .get(api(`/audiobooks/${book.slug}/access`))
        .expect(200);
      expect(guest.body.data).toEqual({
        hasFullAccess: false,
        reason: null,
        expiresAt: null,
        availableChapterIds: [book.freeChapterId],
      });

      await grant(book, user.email).expect(201);
      const buyer = await t
        .http()
        .get(api(`/audiobooks/${book.slug}/access`))
        .set(bearer(user.accessToken))
        .expect(200);
      expect(buyer.body.data).toEqual({
        hasFullAccess: true,
        reason: 'purchased',
        expiresAt: null,
        availableChapterIds: [book.freeChapterId, book.paidChapterId],
      });
    });
  });

  describe('listening progress', () => {
    const save = (token: string, body: object, b = book) =>
      t
        .http()
        .put(api(`/audiobooks/${b.slug}/progress`))
        .set(bearer(token))
        .send(body);

    it('saves and returns the position', async () => {
      await grant(book, user.email).expect(201);

      const saved = await save(user.accessToken, {
        chapterId: book.paidChapterId,
        positionSeconds: 300,
      }).expect(200);
      // Глава 1 (600 с) + 300 с из 1200 с
      expect(saved.body.data).toMatchObject({
        chapterId: book.paidChapterId,
        positionSeconds: 300,
        completed: false,
        percent: 75,
      });

      const current = await t
        .http()
        .get(api(`/audiobooks/${book.slug}/progress`))
        .set(bearer(user.accessToken))
        .expect(200);
      expect(current.body.data.positionSeconds).toBe(300);
    });

    it('returns null before the first listen and requires authentication', async () => {
      const response = await t
        .http()
        .get(api(`/audiobooks/${book.slug}/progress`))
        .set(bearer(user.accessToken))
        .expect(200);
      expect(response.body.data).toBeNull();

      await t
        .http()
        .get(api(`/audiobooks/${book.slug}/progress`))
        .expect(401);
    });

    it('validates the position against the chapter duration', async () => {
      await save(user.accessToken, { chapterId: book.freeChapterId, positionSeconds: 601 }).expect(
        400,
      );
      await save(user.accessToken, { chapterId: book.freeChapterId, positionSeconds: -1 }).expect(
        400,
      );
    });

    it('saves progress only for chapters the user may listen to', async () => {
      await save(user.accessToken, { chapterId: book.freeChapterId, positionSeconds: 10 }).expect(
        200,
      );
      await save(user.accessToken, { chapterId: book.paidChapterId, positionSeconds: 10 }).expect(
        403,
      );
    });

    it('does not grant access just because progress exists', async () => {
      await t.prisma.listeningProgress.create({
        data: {
          userId: user.id,
          audiobookId: book.id,
          chapterId: book.paidChapterId,
          positionSeconds: 100,
          lastListenedAt: new Date(),
        },
      });

      await stream(book, book.paidChapterId, user.accessToken).expect(403);
    });
  });

  describe('my library', () => {
    it('lists purchased audiobooks with progress', async () => {
      const other = await createAudiobook('Белый пароход', 45_000);
      await grant(book, user.email).expect(201);
      await grant(other, user.email).expect(201);
      await t
        .http()
        .delete(api(`/admin/audiobooks/${other.id}/access/${user.id}`))
        .set(bearer(admin.accessToken))
        .expect(204);
      await t
        .http()
        .put(api(`/audiobooks/${book.slug}/progress`))
        .set(bearer(user.accessToken))
        .send({ chapterId: book.freeChapterId, positionSeconds: 60 })
        .expect(200);

      const response = await t
        .http()
        .get(api('/users/me/audiobooks'))
        .set(bearer(user.accessToken))
        .expect(200);

      expect(response.body.meta.total).toBe(1);
      expect(response.body.data).toEqual([
        expect.objectContaining({
          audiobook: expect.objectContaining({ slug: book.slug, isAvailableForSale: true }),
          expiresAt: null,
          progress: expect.objectContaining({ positionSeconds: 60, percent: 5 }),
        }),
      ]);
    });

    it('shows listening history, most recent first', async () => {
      const free = await createAudiobook('Бесплатная', 0);
      const save = (b: TestAudiobook, positionSeconds: number) =>
        t
          .http()
          .put(api(`/audiobooks/${b.slug}/progress`))
          .set(bearer(user.accessToken))
          .send({ chapterId: b.freeChapterId, positionSeconds })
          .expect(200);

      await save(book, 30);
      await save(free, 40);

      const response = await t
        .http()
        .get(api('/users/me/listening'))
        .set(bearer(user.accessToken))
        .expect(200);

      expect(
        response.body.data.map((item: { audiobook: { slug: string }; hasFullAccess: boolean }) => [
          item.audiobook.slug,
          item.hasFullAccess,
        ]),
      ).toEqual([
        [free.slug, true],
        [book.slug, false],
      ]);
      expect(response.body.data[0].chapter).toMatchObject({ chapterNumber: 1, title: 'Глава 1' });
    });
  });

  describe('admin access management', () => {
    it('grants, lists and revokes access with audit records', async () => {
      const granted = await grant(book, user.email.toUpperCase()).expect(201);
      expect(granted.body.data).toMatchObject({
        userId: user.id,
        revokedAt: null,
        expiresAt: null,
      });

      const list = await t
        .http()
        .get(api(`/admin/audiobooks/${book.id}/access`))
        .set(bearer(admin.accessToken))
        .expect(200);
      expect(list.body.data).toEqual([
        expect.objectContaining({
          isActive: true,
          user: expect.objectContaining({ email: user.email }),
        }),
      ]);

      await t
        .http()
        .delete(api(`/admin/audiobooks/${book.id}/access/${user.id}`))
        .set(bearer(admin.accessToken))
        .expect(204);
      await t
        .http()
        .delete(api(`/admin/audiobooks/${book.id}/access/${user.id}`))
        .set(bearer(admin.accessToken))
        .expect(404);

      const actions = await t.prisma.auditLog.findMany({
        where: { action: { startsWith: 'audiobook.access' } },
        orderBy: { createdAt: 'asc' },
      });
      expect(actions.map((a) => a.action)).toEqual([
        'audiobook.access.grant',
        'audiobook.access.revoke',
      ]);
    });

    it('validates the user and the expiry date', async () => {
      await grant(book, 'nobody@example.kg').expect(404);
      await grant(book, user.email, new Date(Date.now() - 1000).toISOString()).expect(400);
      await grant(book, user.email, new Date(Date.now() + 86_400_000).toISOString()).expect(201);
    });

    it('is available to administrators only', async () => {
      await t
        .http()
        .post(api(`/admin/audiobooks/${book.id}/access`))
        .set(bearer(user.accessToken))
        .send({ email: user.email })
        .expect(403);
    });
  });
});
