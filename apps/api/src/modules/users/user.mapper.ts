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
  createdAt: true,
} satisfies Prisma.UserSelect;

export type PublicUserRecord = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

export type PublicUser = Omit<PublicUserRecord, 'emailVerifiedAt'> & { emailVerified: boolean };

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
    createdAt: user.createdAt,
  };
}
