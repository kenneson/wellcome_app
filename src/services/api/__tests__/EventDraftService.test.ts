/* eslint-disable import/first -- Jest must install native mocks before loading the service. */
const mockStorage = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
    __esModule: true,
    default: {
        getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
        setItem: jest.fn(async (key: string, value: string) => { mockStorage.set(key, value); }),
        removeItem: jest.fn(async (key: string) => { mockStorage.delete(key); }),
    },
}));

jest.mock('@/shared/lib/supabase', () => ({
    supabase: { auth: { getSession: jest.fn() } },
}));

import {
    EventDraftRecord,
    eventDraftService,
    resolveDraftRestore,
} from '../EventDraftService';
import { supabase } from '@/shared/lib/supabase';

function remoteDraft(payload: Record<string, unknown> = {}): EventDraftRecord {
    return {
        id: 'draft-1',
        hostId: 'host-1',
        payload,
        currentStep: 1,
        schemaVersion: 1,
        revision: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
}

describe('EventDraftService', () => {
    beforeEach(() => {
        mockStorage.clear();
        (supabase.auth.getSession as jest.Mock).mockResolvedValue({
            data: { session: { access_token: 'test-access-token' } },
        });
    });

    it('keeps unsynced local edits when the cloud revision has not advanced', () => {
        const restored = resolveDraftRestore(
            remoteDraft({ eventType: 'Almoco' }),
            { payload: { eventType: 'Jantar' }, currentStep: 2, revision: 3 },
            true,
        );

        expect(restored).toEqual({
            payload: { eventType: 'Jantar' },
            currentStep: 2,
            needsSync: true,
        });
    });

    it('uses the newer cloud revision instead of overwriting it', () => {
        const restored = resolveDraftRestore(
            remoteDraft({ eventType: 'Jantar' }),
            { payload: { eventType: 'Almoco' }, currentStep: 0, revision: 2 },
            true,
        );

        expect(restored.payload).toEqual({ eventType: 'Jantar' });
        expect(restored.needsSync).toBe(false);
    });

    it('restores dates and safe defaults from a versioned payload', () => {
        const start = new Date(Date.now() + 86_400_000);
        const hydrated = eventDraftService.hydrate({
            eventType: 'Jantar',
            details: { date: start.toISOString() },
        });

        expect(hydrated.details.date).toEqual(start);
        expect(hydrated.dishes).toHaveLength(1);
        expect(hydrated.location.confirmed).toBe(false);
        expect(hydrated.cuisineTypes).toEqual([]);
    });

    it('persists and restores a local snapshot for app restarts', async () => {
        await eventDraftService.saveLocal('draft-1', { eventType: 'Jantar' }, 3, 7);
        await expect(eventDraftService.loadLocal('draft-1')).resolves.toEqual({
            payload: { eventType: 'Jantar' },
            currentStep: 3,
            revision: 7,
        });
    });

    it('publishes with a valid empty JSON object', async () => {
        const fetchMock = jest.fn().mockResolvedValue({
            status: 200,
            ok: true,
            json: async () => ({ id: 'event-1' }),
        });
        global.fetch = fetchMock as typeof fetch;

        await eventDraftService.publish('draft-1', 'publish-key');

        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining('/event-drafts/draft-1/publish'),
            expect.objectContaining({
                method: 'POST',
                body: '{}',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer test-access-token',
                    'Idempotency-Key': 'publish-key',
                },
            }),
        );
    });

    it('deletes a draft without sending an empty JSON body', async () => {
        const fetchMock = jest.fn().mockResolvedValue({ status: 204, ok: true });
        global.fetch = fetchMock as typeof fetch;

        await eventDraftService.delete('draft-1');

        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining('/event-drafts/draft-1'),
            expect.objectContaining({
                method: 'DELETE',
                headers: { Authorization: 'Bearer test-access-token' },
            }),
        );
    });
});
