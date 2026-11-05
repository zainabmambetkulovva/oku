import { AudioAccess, ProductStatus, UserRole } from '@prisma/client';

/**
 * Почему у пользователя есть полный доступ к аудиокниге:
 *  - admin     — администратор слушает всё;
 *  - purchased — действующий доступ (покупка или выдан администратором);
 *  - free      — бесплатная аудиокнига (цена 0) для зарегистрированных;
 *  - null      — полного доступа нет: только бесплатные главы.
 */
export type FullAccessReason = 'admin' | 'purchased' | 'free' | null;

export interface AccessSubject {
  role: UserRole;
}

export interface AccessTarget {
  price: number;
  status: ProductStatus;
}

/** Доступ действует, если он не отозван и не истёк. Купленный доступ — бессрочный. */
export function isGrantActive(
  grant: Pick<AudioAccess, 'revokedAt' | 'expiresAt'> | null | undefined,
  now = new Date(),
): boolean {
  return !!grant && grant.revokedAt === null && (grant.expiresAt === null || grant.expiresAt > now);
}

export function fullAccessReason(
  user: AccessSubject | undefined,
  audiobook: AccessTarget,
  grant: Pick<AudioAccess, 'revokedAt' | 'expiresAt'> | null | undefined,
  now = new Date(),
): FullAccessReason {
  if (!user) {
    return null;
  }
  if (user.role === 'ADMIN') {
    return 'admin';
  }
  // Купившие сохраняют доступ, даже если аудиокнигу сняли с продажи
  if (isGrantActive(grant, now)) {
    return 'purchased';
  }
  if (audiobook.price === 0 && audiobook.status === 'ACTIVE') {
    return 'free';
  }
  return null;
}

/** Срок жизни ссылки на файл главы: хватает на прослушивание, но не дольше 6 часов. */
export function streamUrlTtlSeconds(durationSeconds: number): number {
  const MIN = 15 * 60;
  const MAX = 6 * 60 * 60;
  return Math.min(MAX, Math.max(MIN, durationSeconds * 2 + 10 * 60));
}
