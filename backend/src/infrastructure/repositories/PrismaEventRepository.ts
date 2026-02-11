import { EventRepository } from '../../domain/repositories/EventRepository';
import { CreateEventDTO, UpdateEventDTO, Event } from '../../domain/entities/Event';
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
                eventType: data.eventType,
                cuisineTypes: data.cuisineTypes,
                vibe: data.vibe,
                facilities: data.facilities,
                rules: data.rules,
                host: {
                    connect: { id: data.hostId }
                }
            }
        });

        return this.mapToDomain(event);
    }

    async findAll(filters?: {
        latitude?: number;
        longitude?: number;
        radiusInKm?: number;
        cuisine?: string[];
        vibe?: string[];
        priceMin?: number;
        priceMax?: number;
        eventType?: string;
    }): Promise<Event[]> {
        const where: any = {};

        if (filters?.priceMin !== undefined) where.price = { ...where.price, gte: filters.priceMin };
        if (filters?.priceMax !== undefined) where.price = { ...where.price, lte: filters.priceMax };
        if (filters?.eventType) where.eventType = filters.eventType;
        if (filters?.cuisine && filters.cuisine.length > 0) where.cuisineTypes = { hasSome: filters.cuisine };
        if (filters?.vibe && filters.vibe.length > 0) where.vibe = { hasSome: filters.vibe };

        const events = await prisma.event.findMany({
            where,
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
        const R = 6371;
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
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

    async update(id: string, data: UpdateEventDTO): Promise<Event> {
        const { questions, ...eventData } = data;
        const updateData: any = {};

        if (eventData.title !== undefined) updateData.title = eventData.title;
        if (eventData.description !== undefined) updateData.description = eventData.description;
        if (eventData.price !== undefined) updateData.price = eventData.price;
        if (eventData.maxGuests !== undefined) updateData.maxGuests = eventData.maxGuests;
        if (eventData.eventDate !== undefined) updateData.eventDate = eventData.eventDate;
        if (eventData.location !== undefined) updateData.location = eventData.location;
        if (eventData.latitude !== undefined) updateData.latitude = eventData.latitude;
        if (eventData.longitude !== undefined) updateData.longitude = eventData.longitude;
        if (eventData.coverImageUrl !== undefined) updateData.coverImageUrl = eventData.coverImageUrl;
        if (eventData.eventType !== undefined) updateData.eventType = eventData.eventType;
        if (eventData.cuisineTypes !== undefined) updateData.cuisineTypes = eventData.cuisineTypes;
        if (eventData.vibe !== undefined) updateData.vibe = eventData.vibe;
        if (eventData.facilities !== undefined) updateData.facilities = eventData.facilities;
        if (eventData.rules !== undefined) updateData.rules = eventData.rules;
        if (eventData.accessType !== undefined) updateData.accessType = eventData.accessType;
        if (eventData.requiresApproval !== undefined) updateData.requiresApproval = eventData.requiresApproval;
        if (eventData.allowWaitlist !== undefined) updateData.allowWaitlist = eventData.allowWaitlist;
        if (eventData.autoApproveIfAttended !== undefined) updateData.autoApproveIfAttended = eventData.autoApproveIfAttended;
        if (eventData.autoApproveMinRating !== undefined) updateData.autoApproveMinRating = eventData.autoApproveMinRating;

        const event = await prisma.event.update({
            where: { id },
            data: updateData,
            include: { bookings: true, host: true }
        });

        return this.mapToDomain(event);
    }

    async delete(id: string): Promise<void> {
        await prisma.eventQuestion.deleteMany({ where: { eventId: id } });
        await prisma.event.delete({ where: { id } });
    }

    private mapToDomain(prismaEvent: any): Event {
        return {
            ...prismaEvent,
            price: prismaEvent.price?.toNumber() || 0,
            accessType: prismaEvent.accessType,
            requiresApproval: prismaEvent.requiresApproval,
            allowWaitlist: prismaEvent.allowWaitlist,
            autoApproveIfAttended: prismaEvent.autoApproveIfAttended,
            autoApproveMinRating: prismaEvent.autoApproveMinRating?.toNumber() || null,
            host: prismaEvent.host ? {
                id: prismaEvent.host.id,
                fullName: prismaEvent.host.fullName,
                avatarUrl: prismaEvent.host.avatarUrl,
                expoPushToken: prismaEvent.host.expoPushToken,
                updatedAt: prismaEvent.host.updatedAt
            } : undefined,
            bookings: prismaEvent.bookings ? prismaEvent.bookings.map((b: any) => ({
                id: b.id,
                eventId: b.eventId,
                userId: b.userId,
                status: b.status,
                reviewedAt: b.reviewedAt,
                reviewedBy: b.reviewedBy,
                rejectionReason: b.rejectionReason,
                attendedBefore: b.attendedBefore,
                noShowCount: b.noShowCount,
                createdAt: b.createdAt,
                updatedAt: b.updatedAt
            })) : []
        };
    }
}
