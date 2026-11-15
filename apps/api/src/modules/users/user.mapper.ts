import { Prisma } from '@prisma/client';

/** Поля пользователя, которые можно отдавать клиенту. passwordHash сюда не входит. */
export const publicUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  avatarKey: true,
  role: true,
  status: true,
  emailVerifiedAt: true,
  locale: true,
  // Только чтобы сказать, есть ли пароль и привязан ли Google; сами значения не отдаются
  passwordHash: true,
  googleId: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type PublicUserRecord = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

export type PublicUser = Omit<PublicUserRecord, 'emailVerifiedAt' | 'passwordHash' | 'googleId'> & {
  emailVerified: boolean;
  /** Есть пароль (у входивших только через Google его может не быть) */
  hasPassword: boolean;
  googleLinked: boolean;
};

/** Превращает запись пользователя в безопасный ответ API (явный список полей). */
export function toPublicUser(user: PublicUserRecord): PublicUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    avatarKey: user.avatarKey,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerifiedAt !== null,
    locale: user.locale,
    hasPassword: user.passwordHash !== null,
    googleLinked: user.googleId !== null,
    createdAt: user.createdAt,
  };
}
