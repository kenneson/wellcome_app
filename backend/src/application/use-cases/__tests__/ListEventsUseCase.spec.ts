import { Event } from '../../../domain/entities/Event';
import { EventRepository } from '../../../domain/repositories/EventRepository';
import { ListEventsUseCase } from '../ListEventsUseCase';

describe('ListEventsUseCase', () => {
    const now = new Date('2026-08-04T15:00:00.000Z');
    let eventRepository: jest.Mocked<EventRepository>;

    beforeEach(() => {
        eventRepository = {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        };
    });

    it('returns only events that can still accept registrations', async () => {
        eventRepository.findAll.mockResolvedValue([
            {
                id: 'open-event',
                eventDate: new Date('2026-08-06T18:00:00.000Z'),
                reservationDeadline: new Date('2026-08-05T12:00:00.000Z'),
            },
            {
                id: 'deadline-today',
                eventDate: new Date('2026-08-04T20:00:00.000Z'),
                reservationDeadline: new Date('2026-08-04T03:00:00.000Z'),
            },
            {
                id: 'deadline-passed',
                eventDate: new Date('2026-08-06T18:00:00.000Z'),
                reservationDeadline: new Date('2026-08-03T12:00:00.000Z'),
            },
            {
                id: 'event-started',
                eventDate: new Date('2026-08-04T14:00:00.000Z'),
                endTime: new Date('2026-08-04T20:00:00.000Z'),
                reservationDeadline: null,
            },
        ] as Event[]);

        const useCase = new ListEventsUseCase(eventRepository, () => now);
        const result = await useCase.execute();

        expect(result.map((event) => event.id)).toEqual(['open-event', 'deadline-today']);
    });

    it('forwards location and feed filters to the repository', async () => {
        const filters = {
            latitude: -23.5505,
            longitude: -46.6333,
            radiusInKm: 25,
            cuisine: ['Brasileira'],
            vibe: ['Casual'],
            priceMin: 20,
            priceMax: 80,
            excludeHostId: 'current-user',
        };
        eventRepository.findAll.mockResolvedValue([]);

        const useCase = new ListEventsUseCase(eventRepository, () => now);
        await useCase.execute(filters);

        expect(eventRepository.findAll).toHaveBeenCalledWith(filters);
    });
});
