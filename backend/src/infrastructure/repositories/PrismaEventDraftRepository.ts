import { EventDraft } from '../../domain/entities/EventDraft';
import { EventDraftRepository } from '../../domain/repositories/EventDraftRepository';
import { prisma } from '../database/prismaClient';

export class PrismaEventDraftRepository implements EventDraftRepository {
    async listByHost(hostId: string): Promise<EventDraft[]> {
        const drafts = await prisma.eventDraft.findMany({
            where: { hostId, publishedAt: null },
            orderBy: { updatedAt: 'desc' },
        });
        return drafts.map(this.toDomain);
    }

    async create(hostId: string, payload: Record<string, unknown> = {}): Promise<EventDraft> {
        return this.toDomain(await prisma.eventDraft.create({ data: { hostId, payload: payload as any } }));
    }

    async findOwned(id: string, hostId: string): Promise<EventDraft | null> {
        const draft = await prisma.eventDraft.findFirst({ where: { id, hostId } });
        return draft ? this.toDomain(draft) : null;
    }

    async update(data: {
        id: string;
        hostId: string;
        payload: Record<string, unknown>;
        currentStep: number;
        revision: number;
    }): Promise<EventDraft | null> {
        const result = await prisma.eventDraft.updateMany({
            where: {
                id: data.id,
                hostId: data.hostId,
                revision: data.revision,
                publishedAt: null,
            },
            data: {
                payload: data.payload as any,
                currentStep: data.currentStep,
                revision: { increment: 1 },
            },
        });
        if (result.count !== 1) return null;
        const updated = await prisma.eventDraft.findUniqueOrThrow({ where: { id: data.id } });
        return this.toDomain(updated);
    }

    async markPublished(id: string, hostId: string, publishKey: string, eventId: string): Promise<EventDraft> {
        const result = await prisma.eventDraft.updateMany({
            where: { id, hostId },
            data: {
                publishKey,
                publishedEventId: eventId,
                publishedAt: new Date(),
                revision: { increment: 1 },
            },
        });
        if (result.count !== 1) throw new Error('Draft ownership changed');
        return this.toDomain(await prisma.eventDraft.findUniqueOrThrow({ where: { id } }));
    }

    async delete(id: string, hostId: string): Promise<boolean> {
        const result = await prisma.eventDraft.deleteMany({ where: { id, hostId, publishedAt: null } });
        return result.count === 1;
    }

    private toDomain(raw: any): EventDraft {
        return {
            id: raw.id,
            hostId: raw.hostId,
            payload: (raw.payload ?? {}) as Record<string, unknown>,
            currentStep: raw.currentStep,
            schemaVersion: raw.schemaVersion,
            revision: raw.revision,
            publishKey: raw.publishKey ?? null,
            publishedEventId: raw.publishedEventId ?? null,
            publishedAt: raw.publishedAt ?? null,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        };
    }
}
