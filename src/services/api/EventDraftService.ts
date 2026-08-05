import { EventCreationState } from '@/entities/event/model/types';
import { Event } from '@/entities/event/types';
import { API_URL } from '@/shared/config/api';
import { supabase } from '@/shared/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface EventDraftRecord {
    id: string;
    hostId: string;
    payload: Record<string, unknown>;
    currentStep: number;
    schemaVersion: number;
    revision: number;
    createdAt: string;
    updatedAt: string;
}

export interface LocalEventDraftSnapshot {
    payload: Record<string, unknown>;
    currentStep: number;
    revision: number;
}

export function resolveDraftRestore(
    remote: EventDraftRecord,
    local: LocalEventDraftSnapshot | null,
    requestedDraft: boolean,
) {
    const needsSync = requestedDraft
        && !!local
        && local.revision === remote.revision
        && (
            local.currentStep !== remote.currentStep
            || JSON.stringify(local.payload) !== JSON.stringify(remote.payload)
        );

    return {
        payload: needsSync ? local.payload : remote.payload,
        currentStep: needsSync ? local.currentStep : remote.currentStep,
        needsSync,
    };
}

const LOCAL_DRAFT_PREFIX = '@wellcome/event-draft/';
const PENDING_DRAFT_KEY = 'pending';

export class EventDraftApiError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly fieldErrors: Record<string, string> = {},
        public readonly status = 0,
    ) {
        super(message);
    }
}

class EventDraftService {
    private async headers(extra: Record<string, string> = {}, hasJsonBody = false) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new EventDraftApiError('Sessão expirada', 'UNAUTHORIZED');
        const headers = { ...extra };
        if (hasJsonBody) {
            headers['Content-Type'] ??= 'application/json';
        } else {
            delete headers['Content-Type'];
            delete headers['content-type'];
        }

        return {
            ...headers,
            Authorization: `Bearer ${session.access_token}`,
        };
    }

    async list(): Promise<EventDraftRecord[]> {
        return this.request('/event-drafts');
    }

    async create(payload: Record<string, unknown> = {}): Promise<EventDraftRecord> {
        return this.request('/event-drafts', { method: 'POST', body: JSON.stringify({ payload }) });
    }

    async get(id: string): Promise<EventDraftRecord> {
        return this.request(`/event-drafts/${id}`);
    }

    async update(id: string, payload: Record<string, unknown>, currentStep: number, revision: number): Promise<EventDraftRecord> {
        return this.request(`/event-drafts/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ payload, currentStep, revision }),
        });
    }

    async delete(id: string): Promise<void> {
        await this.request(`/event-drafts/${id}`, { method: 'DELETE' });
    }

    async publish(id: string, idempotencyKey: string): Promise<Event> {
        return this.request(`/event-drafts/${id}/publish`, {
            method: 'POST',
            headers: { 'Idempotency-Key': idempotencyKey },
        });
    }

    serialize(data: EventCreationState): Record<string, unknown> {
        return JSON.parse(JSON.stringify(data));
    }

    hydrate(payload: Record<string, any>): EventCreationState {
        const location = payload.location ?? {};
        const details = payload.details ?? {};
        return {
            eventType: typeof payload.eventType === 'string' ? payload.eventType : '',
            cuisineTypes: Array.isArray(payload.cuisineTypes) ? payload.cuisineTypes : [],
            vibe: Array.isArray(payload.vibe) ? payload.vibe : [],
            isServedInSequence: payload.isServedInSequence === true,
            dishes: Array.isArray(payload.dishes) && payload.dishes.length > 0
                ? payload.dishes
                : [{ id: 'dish-1', name: '', description: '', category: '' }],
            location: {
                address: location.address ?? '',
                city: location.city ?? '',
                state: location.state ?? '',
                neighborhood: location.neighborhood ?? '',
                postalCode: location.postalCode ?? '',
                latitude: Number.isFinite(location.latitude) ? location.latitude : null,
                longitude: Number.isFinite(location.longitude) ? location.longitude : null,
                confirmed: location.confirmed === true,
                facilities: Array.isArray(location.facilities) ? location.facilities : [],
                rules: Array.isArray(location.rules) ? location.rules : [],
            },
            details: {
                pricePerGuest: details.pricePerGuest ?? '',
                maxGuests: details.maxGuests ?? '',
                date: details.date ? new Date(details.date) : null,
                endTime: details.endTime ? new Date(details.endTime) : null,
                registrationDeadline: details.registrationDeadline ? new Date(details.registrationDeadline) : null,
                title: details.title ?? '',
                description: details.description ?? '',
                coverImage: details.coverImage ?? null,
                accessType: details.accessType ?? 'OPEN',
                questions: Array.isArray(details.questions) ? details.questions : [],
            },
            veganOptions: payload.veganOptions === true,
            substitutions: payload.substitutions === true,
            menuAlterations: payload.menuAlterations === true,
        } as EventCreationState;
    }

    async saveLocal(
        id: string | null,
        payload: Record<string, unknown>,
        currentStep: number,
        revision: number,
    ): Promise<void> {
        const snapshot: LocalEventDraftSnapshot = { payload, currentStep, revision };
        await AsyncStorage.setItem(this.localKey(id), JSON.stringify(snapshot));
    }

    async loadLocal(id: string | null): Promise<LocalEventDraftSnapshot | null> {
        const stored = await AsyncStorage.getItem(this.localKey(id));
        if (!stored) return null;
        try {
            return JSON.parse(stored) as LocalEventDraftSnapshot;
        } catch {
            await AsyncStorage.removeItem(this.localKey(id));
            return null;
        }
    }

    async removeLocal(id: string | null): Promise<void> {
        await AsyncStorage.removeItem(this.localKey(id));
    }

    async promoteLocal(pendingId: string | null, remoteId: string): Promise<void> {
        const snapshot = await this.loadLocal(pendingId);
        if (snapshot) await AsyncStorage.setItem(this.localKey(remoteId), JSON.stringify(snapshot));
        await this.removeLocal(pendingId);
    }

    private localKey(id: string | null): string {
        return `${LOCAL_DRAFT_PREFIX}${id ?? PENDING_DRAFT_KEY}`;
    }

    private async request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
        const response = await fetch(`${API_URL}${path}`, {
            ...options,
            headers: await this.headers(
                options.headers as Record<string, string> | undefined,
                options.body !== undefined && options.body !== null,
            ),
        });
        if (response.status === 204) return undefined as T;
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new EventDraftApiError(
                body.message || 'Não foi possível salvar o evento',
                body.code || 'REQUEST_FAILED',
                body.fieldErrors || {},
                response.status,
            );
        }
        return body;
    }
}

export const eventDraftService = new EventDraftService();
