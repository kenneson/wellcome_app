import { Prisma } from '@prisma/client';
import { prisma } from '../database/prismaClient';
import { AuditEntry, AuditLogRepository } from '../../domain/repositories/AuditLogRepository';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class PrismaAuditLogRepository implements AuditLogRepository {
    async record(entry: AuditEntry): Promise<void> {
        await prisma.auditLog.create({
            data: {
                action: entry.action,
                outcome: entry.outcome,
                // actor_id is a uuid column; anything else would make the insert fail.
                actorId: entry.actorId && UUID_PATTERN.test(entry.actorId) ? entry.actorId : null,
                actorRole: entry.actorRole ?? null,
                targetType: entry.targetType ?? null,
                targetId: entry.targetId ?? null,
                statusCode: entry.statusCode ?? null,
                ip: entry.ip ?? null,
                requestId: entry.requestId ?? null,
                metadata: (entry.metadata ?? {}) as Prisma.InputJsonObject,
            },
        });
    }
}
