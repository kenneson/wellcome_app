import { Event } from '../entities/Event';

export interface Coordinates {
    latitude: number;
    longitude: number;
}

export function calculateDistanceKm(origin: Coordinates, destination: Coordinates): number {
    const earthRadiusKm = 6371;
    const latitudeDelta = toRadians(destination.latitude - origin.latitude);
    const longitudeDelta = toRadians(destination.longitude - origin.longitude);
    const originLatitude = toRadians(origin.latitude);
    const destinationLatitude = toRadians(destination.latitude);
    const haversine =
        Math.sin(latitudeDelta / 2) ** 2 +
        Math.cos(originLatitude) * Math.cos(destinationLatitude) *
        Math.sin(longitudeDelta / 2) ** 2;

    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function filterAndSortEventsByProximity(
    events: Event[],
    origin: Coordinates,
    radiusInKm: number
): Event[] {
    return events
        .flatMap((event) => {
            if (event.latitude === null || event.longitude === null) return [];

            const distanceKm = calculateDistanceKm(origin, {
                latitude: event.latitude,
                longitude: event.longitude,
            });
            if (distanceKm > radiusInKm) return [];

            return [{ event, distanceKm }];
        })
        .sort((left, right) =>
            left.distanceKm - right.distanceKm ||
            left.event.eventDate.getTime() - right.event.eventDate.getTime()
        )
        .map(({ event, distanceKm }) => ({
            ...event,
            distanceKm: Number(distanceKm.toFixed(1)),
        }));
}

function toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}
