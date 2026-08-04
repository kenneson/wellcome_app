import { Event } from '../../entities/Event';
import { calculateDistanceKm, filterAndSortEventsByProximity } from '../EventProximity';

function eventAt(id: string, latitude: number | null, longitude: number | null, eventDate: string): Event {
    return {
        id,
        latitude,
        longitude,
        eventDate: new Date(eventDate),
    } as Event;
}

describe('EventProximity', () => {
    it('calculates distance using geographic coordinates', () => {
        const distance = calculateDistanceKm(
            { latitude: 0, longitude: 0 },
            { latitude: 0.1, longitude: 0 }
        );

        expect(distance).toBeCloseTo(11.12, 1);
    });

    it('filters by radius, excludes events without coordinates, and sorts nearest first', () => {
        const events = [
            eventAt('far', 0.15, 0, '2026-08-08T18:00:00.000Z'),
            eventAt('outside', 0.3, 0, '2026-08-06T18:00:00.000Z'),
            eventAt('near', 0.05, 0, '2026-08-10T18:00:00.000Z'),
            eventAt('unknown', null, null, '2026-08-05T18:00:00.000Z'),
        ];

        const result = filterAndSortEventsByProximity(
            events,
            { latitude: 0, longitude: 0 },
            20
        );

        expect(result.map((event) => event.id)).toEqual(['near', 'far']);
        expect(result[0].distanceKm).toBe(5.6);
        expect(result[1].distanceKm).toBe(16.7);
    });

    it('uses event date as the tie breaker for equal distances', () => {
        const events = [
            eventAt('later', 0.05, 0, '2026-08-10T18:00:00.000Z'),
            eventAt('sooner', 0.05, 0, '2026-08-08T18:00:00.000Z'),
        ];

        const result = filterAndSortEventsByProximity(
            events,
            { latitude: 0, longitude: 0 },
            20
        );

        expect(result.map((event) => event.id)).toEqual(['sooner', 'later']);
    });
});
