import { EventDraft } from '../entities/EventDraft';

export interface EventDraftRepository {
    listByHost(hostId: string): Promise<EventDraft[]>;
    create(hostId: string, payload?: Record<string, unknown>): Promise<EventDraft>;
    findOwned(id: string, hostId: string): Promise<EventDraft | null>;
    update(data: {
        id: string;
        hostId: string;
        payload: Record<string, unknown>;
        currentStep: number;
        revision: number;
    }): Promise<EventDraft | null>;
    markPublished(id: string, hostId: string, publishKey: string, eventId: string): Promise<EventDraft>;
    delete(id: string, hostId: string): Promise<boolean>;
}
