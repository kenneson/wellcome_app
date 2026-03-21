import { CreateEventDTO, Event, UpdateEventDTO } from '../../domain/entities/Event';
import { EventRepository } from '../../domain/repositories/EventRepository';
import { prisma } from '../database/prismaClient';

export class PrismaEventRepository implements EventRepository {
    async create(data: CreateEventDTO): Promise<Event> {
        const { dishes, ...eventData } = data;

        // Debug logging
        console.log('[DEBUG] PrismaEventRepository.create - Input data:');
        console.log('  - endTime:', eventData.endTime);
        console.log('  - reservationDeadline:', eventData.reservationDeadline);
        console.log('  - dishes count:', dishes?.length || 0);
        console.log('  - dishes:', JSON.stringify(dishes));

        const event = await prisma.event.create({
            data: {
                title: eventData.title,
                description: eventData.description,
                price: eventData.price,
                maxGuests: eventData.maxGuests,
                eventDate: eventData.eventDate,
                endTime: eventData.endTime,
                reservationDeadline: eventData.reservationDeadline,
                location: eventData.location,
                latitude: eventData.latitude,
                longitude: eventData.longitude,
                coverImageUrl: eventData.coverImageUrl,
                imageGallery: eventData.imageGallery,
                eventType: eventData.eventType,
                cuisineTypes: eventData.cuisineTypes,
                vibe: eventData.vibe,
                facilities: eventData.facilities,
                rules: eventData.rules,
                dietaryOptions: eventData.dietaryOptions,
                host: {
                    connect: { id: eventData.hostId }
                },
                ...(dishes && dishes.length > 0 ? {
                    dishes: {
                        create: dishes.map((d, idx) => ({
                            name: d.name,
                            description: d.description,
                            category: d.category,
                            order: d.order ?? idx,
                        }))
                    }
                } : {}),
            },
            include: { dishes: { orderBy: { order: 'asc' } }, host: true }
        });

        console.log('[DEBUG] PrismaEventRepository.create - Created event:');
        console.log('  - endTime:', event.endTime);
        console.log('  - reservationDeadline:', event.reservationDeadline);
        console.log('  - dishes count:', event.dishes?.length || 0);
        console.log('  - host fullName:', event.host?.fullName);
        console.log('  - host avatarUrl:', event.host?.avatarUrl);

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
        excludeHostId?: string;
    }): Promise<Event[]> {
        const where: any = {};

        // Filter out past events by default (only show upcoming events)
        const now = new Date();
        where.OR = [
            { endTime: { gt: now } },
            {
                endTime: null,
                eventDate: { gt: now }
            }
        ];

        if (filters?.priceMin !== undefined) where.price = { ...where.price, gte: filters.priceMin };
        if (filters?.priceMax !== undefined) where.price = { ...where.price, lte: filters.priceMax };
        if (filters?.eventType) where.eventType = filters.eventType;
        if (filters?.cuisine && filters.cuisine.length > 0) where.cuisineTypes = { hasSome: filters.cuisine };
        if (filters?.vibe && filters.vibe.length > 0) where.vibe = { hasSome: filters.vibe };
        if (filters?.excludeHostId) where.hostId = { not: filters.excludeHostId };

        const events = await prisma.event.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { host: true }
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
            include: {
                bookings: true,
                host: true,
                dishes: { orderBy: { order: 'asc' } },
                reviews: {
                    include: { user: true },
                    orderBy: { createdAt: 'desc' }
                },
                questions: { orderBy: { order: 'asc' } }
            }
        });
        
        if (!event) return null;
        
        // Debug logging
        console.log('[DEBUG] findById - Raw Prisma event:');
        console.log('  - endTime:', event.endTime);
        console.log('  - reservationDeadline:', event.reservationDeadline);
        console.log('  - dishes count:', event.dishes?.length || 0);
        console.log('  - host:', event.host ? {
            id: event.host.id,
            fullName: event.host.fullName,
            avatarUrl: event.host.avatarUrl
        } : 'null');
        
        const mapped = this.mapToDomain(event);
        
        console.log('[DEBUG] findById - Mapped event:');
        console.log('  - endTime:', mapped.endTime);
        console.log('  - reservationDeadline:', mapped.reservationDeadline);
        console.log('  - dishes count:', mapped.dishes?.length || 0);
        console.log('  - host:', mapped.host ? {
            id: mapped.host.id,
            fullName: mapped.host.fullName,
            avatarUrl: mapped.host.avatarUrl
        } : 'null');
        
        return mapped;
    }

    async update(id: string, data: UpdateEventDTO): Promise<Event> {
        const { questions, dishes, ...eventData } = data;
        const updateData: any = {};

        if (eventData.title !== undefined) updateData.title = eventData.title;
        if (eventData.description !== undefined) updateData.description = eventData.description;
        if (eventData.price !== undefined) updateData.price = eventData.price;
        if (eventData.maxGuests !== undefined) updateData.maxGuests = eventData.maxGuests;
        if (eventData.eventDate !== undefined) updateData.eventDate = eventData.eventDate;
        if (eventData.endTime !== undefined) updateData.endTime = eventData.endTime;
        if (eventData.reservationDeadline !== undefined) updateData.reservationDeadline = eventData.reservationDeadline;
        if (eventData.location !== undefined) updateData.location = eventData.location;
        if (eventData.latitude !== undefined) updateData.latitude = eventData.latitude;
        if (eventData.longitude !== undefined) updateData.longitude = eventData.longitude;
        if (eventData.coverImageUrl !== undefined) updateData.coverImageUrl = eventData.coverImageUrl;
        if (eventData.imageGallery !== undefined) updateData.imageGallery = eventData.imageGallery;
        if (eventData.eventType !== undefined) updateData.eventType = eventData.eventType;
        if (eventData.cuisineTypes !== undefined) updateData.cuisineTypes = eventData.cuisineTypes;
        if (eventData.vibe !== undefined) updateData.vibe = eventData.vibe;
        if (eventData.facilities !== undefined) updateData.facilities = eventData.facilities;
        if (eventData.rules !== undefined) updateData.rules = eventData.rules;
        if (eventData.dietaryOptions !== undefined) updateData.dietaryOptions = eventData.dietaryOptions;
        if (eventData.accessType !== undefined) updateData.accessType = eventData.accessType;
        if (eventData.requiresApproval !== undefined) updateData.requiresApproval = eventData.requiresApproval;
        if (eventData.allowWaitlist !== undefined) updateData.allowWaitlist = eventData.allowWaitlist;
        if (eventData.autoApproveIfAttended !== undefined) updateData.autoApproveIfAttended = eventData.autoApproveIfAttended;
        if (eventData.autoApproveMinRating !== undefined) updateData.autoApproveMinRating = eventData.autoApproveMinRating;

        // Replace dishes if provided
        if (dishes !== undefined) {
            await prisma.eventDish.deleteMany({ where: { eventId: id } });
            if (dishes.length > 0) {
                await prisma.eventDish.createMany({
                    data: dishes.map((d, idx) => ({
                        eventId: id,
                        name: d.name,
                        description: d.description,
                        category: d.category,
                        order: d.order ?? idx,
                    }))
                });
            }
        }

        // Replace questions if provided
        if (questions !== undefined) {
            await prisma.eventQuestion.deleteMany({ where: { eventId: id } });
            if (questions.length > 0) {
                await prisma.eventQuestion.createMany({
                    data: questions.map((q, idx) => ({
                        eventId: id,
                        question: q.question,
                        questionType: q.questionType as any,
                        options: q.options || [],
                        required: q.required,
                        order: q.order ?? idx
                    }))
                });
            }
        }

        const event = await prisma.event.update({
            where: { id },
            data: updateData,
            include: {
                bookings: true,
                host: true,
                dishes: { orderBy: { order: 'asc' } },
                reviews: {
                    include: { user: true },
                    orderBy: { createdAt: 'desc' }
                },
                questions: { orderBy: { order: 'asc' } }
            }
        });

        return this.mapToDomain(event);
    }

    async delete(id: string): Promise<void> {
        await prisma.eventDish.deleteMany({ where: { eventId: id } });
        await prisma.eventReview.deleteMany({ where: { eventId: id } });
        await prisma.eventQuestion.deleteMany({ where: { eventId: id } });
        await prisma.booking.deleteMany({ where: { eventId: id } });
        await prisma.event.delete({ where: { id } });
    }

    private mapToDomain(prismaEvent: any): Event {
        const mapped = {
            id: prismaEvent.id,
            title: prismaEvent.title,
            description: prismaEvent.description,
            price: prismaEvent.price?.toNumber() || 0,
            maxGuests: prismaEvent.maxGuests,
            eventDate: prismaEvent.eventDate,
            endTime: prismaEvent.endTime,
            reservationDeadline: prismaEvent.reservationDeadline,
            location: prismaEvent.location,
            latitude: prismaEvent.latitude,
            longitude: prismaEvent.longitude,
            coverImageUrl: prismaEvent.coverImageUrl,
            imageGallery: prismaEvent.imageGallery || [],
            eventType: prismaEvent.eventType,
            cuisineTypes: prismaEvent.cuisineTypes || [],
            vibe: prismaEvent.vibe || [],
            facilities: prismaEvent.facilities || [],
            rules: prismaEvent.rules || [],
            dietaryOptions: prismaEvent.dietaryOptions || [],
            hostId: prismaEvent.hostId,
            accessType: prismaEvent.accessType,
            requiresApproval: prismaEvent.requiresApproval,
            allowWaitlist: prismaEvent.allowWaitlist,
            autoApproveIfAttended: prismaEvent.autoApproveIfAttended,
            autoApproveMinRating: prismaEvent.autoApproveMinRating?.toNumber() || null,
            createdAt: prismaEvent.createdAt,
            updatedAt: prismaEvent.updatedAt,
            host: prismaEvent.host ? {
                id: prismaEvent.host.id,
                fullName: prismaEvent.host.fullName,
                username: prismaEvent.host.username,
                avatarUrl: prismaEvent.host.avatarUrl,
                occupation: prismaEvent.host.occupation,
                bio: prismaEvent.host.bio,
                city: prismaEvent.host.city,
                neighborhood: prismaEvent.host.neighborhood,
                languages: prismaEvent.host.languages || [],
                birthDecade: prismaEvent.host.birthDecade,
                pets: prismaEvent.host.pets,
                phoneNumber: prismaEvent.host.phoneNumber,
                email: prismaEvent.host.email,
                isSuperhost: prismaEvent.host.isSuperhost,
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
            })) : [],
            dishes: prismaEvent.dishes ? prismaEvent.dishes.map((d: any) => ({
                id: d.id,
                eventId: d.eventId,
                name: d.name,
                description: d.description,
                category: d.category,
                order: d.order,
                createdAt: d.createdAt
            })) : [],
            questions: prismaEvent.questions ? prismaEvent.questions.map((q: any) => ({
                id: q.id,
                eventId: q.eventId,
                question: q.question,
                questionType: q.questionType,
                options: q.options,
                required: q.required,
                order: q.order
            })) : [],
            reviews: prismaEvent.reviews ? prismaEvent.reviews.map((r: any) => ({
                id: r.id,
                eventId: r.eventId,
                userId: r.userId,
                rating: r.rating,
                comment: r.comment,
                createdAt: r.createdAt,
                user: r.user ? {
                    id: r.user.id,
                    fullName: r.user.fullName,
                    avatarUrl: r.user.avatarUrl
                } : undefined
            })) : []
        };
        
        console.log('[DEBUG] mapToDomain - Mapped result:');
        console.log('  - endTime:', mapped.endTime);
        console.log('  - reservationDeadline:', mapped.reservationDeadline);
        console.log('  - host:', mapped.host ? 'present' : 'missing');
        console.log('  - dishes:', mapped.dishes ? `${mapped.dishes.length} items` : 'missing');
        
        return mapped;
    }
}

