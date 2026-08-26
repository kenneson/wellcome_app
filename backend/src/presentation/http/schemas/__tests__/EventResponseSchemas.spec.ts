import Fastify from 'fastify';
import { eventListResponseSchema } from '../EventResponseSchemas';

describe('event list response schema', () => {
    it('preserves the capacity fields required by the feed', async () => {
        const app = Fastify();
        app.get('/events', {
            schema: { response: { 200: eventListResponseSchema } },
        }, async () => [{
            id: 'event-1',
            title: 'Jantar',
            description: 'Evento de teste',
            price: 50,
            maxGuests: 8,
            participantCount: 3,
            eventDate: '2026-08-30T18:00:00.000Z',
            endTime: '2026-08-30T22:00:00.000Z',
            reservationDeadline: null,
            location: 'Curitiba - PR',
            city: 'Curitiba',
            state: 'PR',
            distanceKm: 2.5,
            coverImageUrl: null,
            eventType: 'Jantar',
            cuisineTypes: ['Brasileira'],
            vibe: ['Casual'],
            accessType: 'OPEN',
            requiresApproval: false,
            allowWaitlist: true,
            host: {
                id: 'host-1',
                fullName: 'Anfitrião',
                username: null,
                avatarUrl: null,
                isSuperhost: false,
            },
        }]);

        const response = await app.inject({ method: 'GET', url: '/events' });

        expect(response.statusCode).toBe(200);
        expect(response.json()[0]).toEqual(expect.objectContaining({
            maxGuests: 8,
            participantCount: 3,
            endTime: '2026-08-30T22:00:00.000Z',
            distanceKm: 2.5,
            cuisineTypes: ['Brasileira'],
            vibe: ['Casual'],
        }));

        await app.close();
    });
});
