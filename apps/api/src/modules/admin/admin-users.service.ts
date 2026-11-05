import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import { paginated, skipFor } from '../../common/pagination/pagination';
import { Env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SessionsService } from '../auth/sessions.service';
import { AdminActor } from '../categories/categories.service';
import { publicUserSelect, toPublicUser } from '../users/user.mapper';
import { AdminUsersQueryDto } from './dto/admin.dto';

const adminUserSelect = {
  ...publicUserSelect,
  failedLoginAttempts: true,
  lockedUntil: true,
  _count: { select: { orders: true, reviews: true } },
} satisfies Prisma.UserSelect;

type AdminUserRecord = Prisma.UserGetPayload<{ select: typeof adminUserSelect }>;

@Injectable()
export class AdminUsersService {
  private readonly roleManagers: string[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionsService,
    private readonly audit: AuditService,
    config: ConfigService<Env, true>,
  ) {
    this.roleManagers = config.get('ROLE_MANAGER_EMAILS', { infer: true });
  }

  async list(query: AdminUsersQueryDto) {
    const search = query.search;
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.role && { role: query.role }),
      ...(query.status && { status: query.status }),
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ],
      }),
    };
    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: adminUserSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: skipFor(query),
        take: query.limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginated(
      users.map((user) => this.toResponse(user)),
      total,
      query,
    );
  }

  /** Карточка пользователя со статистикой покупок. */
  async get(userId: string) {
    const user = await this.find(userId);
    const [spent, paidOrders, audiobooks] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { order: { userId }, status: 'SUCCEEDED' },
        _sum: { amount: true },
      }),
      this.prisma.order.count({
        where: { userId, status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'COMPLETED'] } },
      }),
      this.prisma.audioAccess.count({ where: { userId, revokedAt: null } }),
    ]);
    return {
      ...this.toResponse(user),
      stats: {
        ordersCount: user._count.orders,
        paidOrdersCount: paidOrders,
        totalSpent: spent._sum.amount ?? 0,
        audiobooksCount: audiobooks,
        reviewsCount: user._count.reviews,
      },
    };
  }

  /** Блокировка или деактивация сразу завершает все сессии пользователя. */
  async setStatus(userId: string, status: UserStatus, actor: AdminActor) {
    if (userId === actor.id) {
      throw new BadRequestException('You cannot change your own status');
    }
    const before = await this.find(userId);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { status } });
      if (status !== 'ACTIVE') {
        await this.sessions.revokeAll(userId, undefined, tx);
      }
      await this.audit.log(
        {
          actorId: actor.id,
          action: 'user.status',
          entityType: 'user',
          entityId: userId,
          oldData: { status: before.status },
          newData: { status },
          ipAddress: actor.ip,
        },
        tx,
      );
    });
    return this.get(userId);
  }

  /** Снять блокировку входа после неудачных попыток. */
  async unlock(userId: string, actor: AdminActor) {
    await this.find(userId);
    await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
    await this.audit.log({
      actorId: actor.id,
      action: 'user.unlock',
      entityType: 'user',
      entityId: userId,
      ipAddress: actor.ip,
    });
    return this.get(userId);
  }

  /**
   * Назначение ролей — только «менеджеры ролей» (ROLE_MANAGER_EMAILS).
   * Свою роль изменить нельзя; последнего администратора разжаловать нельзя.
   */
  async setRole(userId: string, role: UserRole, actor: AdminActor & { email: string }) {
    if (!this.roleManagers.includes(actor.email.toLowerCase())) {
      throw new ForbiddenException('Only role managers can change roles');
    }
    if (userId === actor.id) {
      throw new BadRequestException('You cannot change your own role');
    }
    const before = await this.find(userId);
    if (before.role === role) {
      return this.get(userId);
    }
    if (before.role === 'ADMIN' && role !== 'ADMIN') {
      const admins = await this.prisma.user.count({ where: { role: 'ADMIN', deletedAt: null } });
      if (admins <= 1) {
        throw new ConflictException('Cannot remove the last administrator');
      }
    }

    await this.prisma.user.update({ where: { id: userId }, data: { role } });
    await this.audit.log({
      actorId: actor.id,
      action: 'user.role',
      entityType: 'user',
      entityId: userId,
      oldData: { role: before.role },
      newData: { role },
      ipAddress: actor.ip,
    });
    return this.get(userId);
  }

  private async find(userId: string): Promise<AdminUserRecord> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: adminUserSelect,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private toResponse(user: AdminUserRecord) {
    const { _count, failedLoginAttempts, lockedUntil, ...publicFields } = user;
    return {
      ...toPublicUser(publicFields),
      failedLoginAttempts,
      lockedUntil,
      isLocked: lockedUntil !== null && lockedUntil > new Date(),
      ordersCount: _count.orders,
      isRoleManager: this.roleManagers.includes(user.email.toLowerCase()),
    };
  }
}
