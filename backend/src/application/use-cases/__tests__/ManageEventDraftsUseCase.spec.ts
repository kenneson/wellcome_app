import { EventDraft } from '../../../domain/entities/EventDraft';
import { EventDraftRepository } from '../../../domain/repositories/EventDraftRepository';
import { EventRepository } from '../../../domain/repositories/EventRepository';
import { ManageEventDraftsUseCase } from '../ManageEventDraftsUseCase';

function validDraftPayload() {
    const start = new Date(Date.now() + 48 * 60 * 60 * 1000);
    return {
        eventType: 'Jantar',
        cuisineTypes: ['Brasileira'],
        vibe: [],
        isServedInSequence: true,
        dishes: [{ id: 'dish-1', name: 'Moqueca', description: 'Peixe e leite de coco', category: 'PRATO_PRINCIPAL' }],
        location: {
            address: 'Rua das Flores, 100, Centro, Curitiba - PR',
            city: 'Curitiba',
            state: 'PR',
            latitude: -25.4284,
            longitude: -49.2733,
            facilities: [],
            rules: [],
        },
        details: {
            title: 'Jantar brasileiro especial',
            description: 'Uma experiencia gastronomica completa com ingredientes locais e boa companhia.',
            pricePerGuest: '80,00',
            maxGuests: '10',
            date: start.toISOString(),
            endTime: new Date(start.getTime() + 4 * 60 * 60 * 1000).toISOString(),
            registrationDeadline: new Date(start.getTime() - 24 * 60 * 60 * 1000).toISOString(),
            coverImage: 'https://images.example.com/event.jpg',
            accessType: 'OPEN_WITH_APPROVAL',
            questions: [],
        },
    };
}

function draft(overrides: Partial<EventDraft> = {}): EventDraft {
    return {
        id: 'draft-1',
        hostId: 'host-1',
        payload: validDraftPayload(),
        currentStep: 4,
        schemaVersion: 1,
        revision: 3,
        publishKey: null,
        publishedEventId: null,
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

describe('ManageEventDraftsUseCase', () => {
    let drafts: jest.Mocked<EventDraftRepository>;
    let events: jest.Mocked<EventRepository>;
    let createEvent: { execute: jest.Mock };
    let useCase: ManageEventDraftsUseCase;

    beforeEach(() => {
        drafts = {
            listByHost: jest.fn(),
            create: jest.fn(),
            findOwned: jest.fn(),
            update: jest.fn(),
            markPublished: jest.fn(),
            delete: jest.fn(),
        };
        events = {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            findByCreationKey: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        };
        createEvent = { execute: jest.fn() };
        useCase = new ManageEventDraftsUseCase(drafts, events, createEvent as any);
    });

    it('does not expose a draft that belongs to another host', async () => {
        drafts.findOwned.mockResolvedValue(null);
        await expect(useCase.get('draft-1', 'other-host')).rejects.toMatchObject({
            code: 'DRAFT_NOT_FOUND',
            statusCode: 404,
        });
    });

    it('reports a revision conflict without overwriting newer data', async () => {
        drafts.update.mockResolvedValue(null);
        drafts.findOwned.mockResolvedValue(draft({ revision: 4 }));
        await expect(useCase.update({
            id: 'draft-1',
            hostId: 'host-1',
            payload: validDraftPayload(),
            currentStep: 3,
            revision: 3,
        })).rejects.toMatchObject({ code: 'DRAFT_CONFLICT', statusCode: 409 });
    });

    it('publishes with a stable creation key and marks the draft afterwards', async () => {
        const event = { id: 'event-1' } as any;
        drafts.findOwned.mockResolvedValue(draft());
        createEvent.execute.mockResolvedValue(event);
        drafts.markPublished.mockResolvedValue(draft({ publishedEventId: 'event-1', publishKey: 'key-1' }));

        await expect(useCase.publish('draft-1', 'host-1', 'key-1')).resolves.toBe(event);
        expect(createEvent.execute).toHaveBeenCalledWith(expect.objectContaining({
            hostId: 'host-1',
            creationKey: 'event-draft:draft-1',
            accessType: 'OPEN_WITH_APPROVAL',
            requiresApproval: true,
        }));
        expect(drafts.markPublished).toHaveBeenCalledWith('draft-1', 'host-1', 'key-1', 'event-1');
    });

    it('returns the existing event when publication is retried', async () => {
        const event = { id: 'event-1' } as any;
        drafts.findOwned.mockResolvedValue(draft({ publishedEventId: 'event-1', publishKey: 'key-1' }));
        events.findById.mockResolvedValue(event);

        await expect(useCase.publish('draft-1', 'host-1', 'key-1')).resolves.toBe(event);
        expect(createEvent.execute).not.toHaveBeenCalled();
        expect(drafts.markPublished).not.toHaveBeenCalled();
    });

    it('rejects a different key while a publication is already associated with the draft', async () => {
        drafts.findOwned.mockResolvedValue(draft({ publishKey: 'key-1' }));
        await expect(useCase.publish('draft-1', 'host-1', 'key-2')).rejects.toMatchObject({
            code: 'PUBLISH_CONFLICT',
            statusCode: 409,
        });
    });
});
