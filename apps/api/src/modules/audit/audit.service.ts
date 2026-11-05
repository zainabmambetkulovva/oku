import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditEntry {
  /** Кто выполнил действие */
  actorId: string;
  /** Что сделано, например book.create, book.update, category.delete */
  action: string;
  entityType: string;
  entityId: string;
  oldData?: unknown;
  newData?: unknown;
  ipAddress?: string;
}

type Db = PrismaService | Prisma.TransactionClient;

/** Журнал действий администраторов (таблица audit_logs). Просмотр — этап Б8. */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry, db: Db = this.prisma): Promise<void> {
    await db.auditLog.create({
      data: {
        userId: entry.actorId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        oldData: toJson(entry.oldData),
        newData: toJson(entry.newData),
        ipAddress: entry.ipAddress,
      },
    });
  }
}

/** Даты и прочее — в JSON-совместимый вид; undefined — без значения. */
function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  return value === undefined
    ? undefined
    : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);
}
