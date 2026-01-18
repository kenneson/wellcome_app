import { EventRepository } from '../../domain/repositories/EventRepository';
import { CreateEventDTO, Event } from '../../domain/entities/Event';
import { prisma } from '../database/prismaClient';

export class PrismaEventRepository implements EventRepository {
    async create(data: CreateEventDTO): Promise<Event> {
        const event = await prisma.event.create({
            data: {
                title: data.title,
                description: data.description,
                price: data.price,
                maxGuests: data.maxGuests,
                eventDate: data.eventDate,
                location: data.location,
                latitude: data.latitude,
                longitude: data.longitude,
                coverImageUrl: data.coverImageUrl,
                host: {
                    connect: { id: data.hostId }
                }
            }
        });

        return this.mapToDomain(event);
    }

    async findAll(filters?: { latitude?: number; longitude?: number; radiusInKm?: number }): Promise<Event[]> {
        const events = await prisma.event.findMany({
            orderBy: { eventDate: 'asc' }
        });

        const mappedEvents = events.map(this.mapToDomain);

        if (filters?.latitude && filters?.longitude && filters?.radiusInKm) {
            return mappedEvents.filter(event => {
                if (!event.latitude || !event.longitude) return false;
                const distance = this.getDistanceFromLatLonInKm(
                    filters.latitude!,
                    filters.longitude!,
                    event.latitude,
                    event.longitude
                );
                return distance <= filters.radiusInKm!;
            });
        }

        return mappedEvents;
    }

    private getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
        const R = 6371; // Radius of the earth in km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km
        return d;
    }

    private deg2rad(deg: number) {
        return deg * (Math.PI / 180);
    }

    async findById(id: string): Promise<Event | null> {
        const event = await prisma.event.findUnique({
            where: { id },
            include: { bookings: true, host: true }
        });
        return event ? this.mapToDomain(event) : null;
    }

    private mapToDomain(prismaEvent: any): Event {
        return {
            ...prismaEvent,
            price: prismaEvent.price.toNumber(),
            host: prismaEvent.host ? {
                id: prismaEvent.host.id,
                fullName: prismaEvent.host.fullName,
                avatarUrl: prismaEvent.host.avatarUrl,
                updatedAt: prismaEvent.host.updatedAt
                // map other user fields if needed
            } : undefined,
            bookings: prismaEvent.bookings ? prismaEvent.bookings.map((b: any) => ({
                ...b,
                userId: b.userId // Ensure userId is mapped if database field differs (it was mapped in PrismaBookingRepository but here we get raw object)
            })) : []
        };
    }
}
