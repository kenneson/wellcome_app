import { z } from 'zod';
import { EventCreationError } from '../errors/EventCreationError';
import { EventDraftRepository } from '../../domain/repositories/EventDraftRepository';
import { EventRepository } from '../../domain/repositories/EventRepository';
import { createEventInputSchema, normalizeEventDraftPayload } from '../validation/EventCreationSchema';
import { CreateEventUseCase } from './CreateEventUseCase';
import { EventAccessType } from '../../domain/value-objects/EventAccessType';

export const draftPayloadSchema = z.record(z.string(), z.unknown());

export class ManageEventDraftsUseCase {
    constructor(
        private readonly drafts: EventDraftRepository,
        private readonly events: EventRepository,
        private readonly createEvent: CreateEventUseCase,
    ) {}

    list(hostId: string) {
        return this.drafts.listByHost(hostId);
    }

    create(hostId: string, payload: Record<string, unknown> = {}) {
        return this.drafts.create(hostId, payload);
    }

    async get(id: string, hostId: string) {
        const draft = await this.drafts.findOwned(id, hostId);
        if (!draft) throw new EventCreationError('DRAFT_NOT_FOUND', 'Rascunho não encontrado', {}, 404);
        return draft;
    }

    async update(input: {
        id: string;
        hostId: string;
        payload: Record<string, unknown>;
        currentStep: number;
        revision: number;
    }) {
        const draft = await this.drafts.update(input);
        if (draft) return draft;

        const existing = await this.drafts.findOwned(input.id, input.hostId);
        if (!existing) throw new EventCreationError('DRAFT_NOT_FOUND', 'Rascunho não encontrado', {}, 404);
        throw new EventCreationError(
            'DRAFT_CONFLICT',
            'Este rascunho foi alterado em outro aparelho',
            { revision: 'Atualize o rascunho antes de continuar' },
            409,
        );
    }

    async delete(id: string, hostId: string) {
        const deleted = await this.drafts.delete(id, hostId);
        if (!deleted) throw new EventCreationError('DRAFT_NOT_FOUND', 'Rascunho não encontrado', {}, 404);
    }

    async publish(id: string, hostId: string, publishKey: string) {
        const draft = await this.get(id, hostId);
        if (draft.publishedEventId) {
            const published = await this.events.findById(draft.publishedEventId);
            if (published) return published;
        }
        if (draft.publishKey && draft.publishKey !== publishKey) {
            throw new EventCreationError('PUBLISH_CONFLICT', 'Este rascunho já está sendo publicado', {}, 409);
        }

        const body = createEventInputSchema.parse(normalizeEventDraftPayload(draft.payload));
        const event = await this.createEvent.execute({
            ...body,
            hostId,
            creationKey: `event-draft:${draft.id}`,
            requiresApproval: body.accessType === EventAccessType.OPEN_WITH_APPROVAL,
            questions: body.questions.map((question, index) => ({ ...question, order: index })),
            dishes: body.dishes.map((dish, index) => ({ ...dish, order: dish.order ?? index })),
        });
        await this.drafts.markPublished(draft.id, hostId, publishKey, event.id);
        return event;
    }
}
