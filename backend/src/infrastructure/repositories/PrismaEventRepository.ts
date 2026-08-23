import { CreateEventDTO, Event, UpdateEventDTO } from '../../domain/entities/Event';
import { EventFilters, EventRepository } from '../../domain/repositories/EventRepository';
import { isEventInCity } from '../../domain/services/EventCity';
import { filterAndSortEventsByProximity } from '../../domain/services/EventProximity';
import { prisma } from '../database/prismaClient';

export class PrismaEventRepository implements EventRepository {
    async create(data: CreateEventDTO): Promise<Event> {
        const { dishes, questions, ...eventData } = data;

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
                city: eventData.city,
                state: eventData.state,
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
                isServedInSequence: eventData.isServedInSequence ?? false,
                creationKey: eventData.creationKey,
                accessType: eventData.accessType,
                requiresApproval: eventData.accessType === 'OPEN_WITH_APPROVAL',
                allowWaitlist: eventData.allowWaitlist,
                autoApproveIfAttended: eventData.autoApproveIfAttended,
                autoApproveMinRating: eventData.autoApproveMinRating,
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
                ...(questions && questions.length > 0 ? {
                    questions: {
                        create: questions.map((question, index) => ({
                            question: question.question,
                            questionType: question.questionType as any,
                            options: question.options ?? [],
                            required: question.required,
                            order: question.order ?? index,
                        })),
                    },
                } : {}),
            },
            include: {
                dishes: { orderBy: { order: 'asc' } },
                questions: { orderBy: { order: 'asc' } },
                host: true,
            }
        });

        return this.mapToDomain(event);
    }

    async findAll(filters?: EventFilters): Promise<Event[]> {
        const where: any = {};

        // Coarse database filter. The use case also applies the registration cutoff.
        const now = new Date();
        where.eventDate = { gt: now };

        if (filters?.priceMin !== undefined) where.price = { ...where.price, gte: filters.priceMin };
        if (filters?.priceMax !== undefined) where.price = { ...where.price, lte: filters.priceMax };
        if (filters?.eventType) where.eventType = filters.eventType;
        if (filters?.cuisine && filters.cuisine.length > 0) where.cuisineTypes = { hasSome: filters.cuisine };
        if (filters?.vibe && filters.vibe.length > 0) where.vibe = { hasSome: filters.vibe };
        if (filters?.excludeHostId) where.hostId = { not: filters.excludeHostId };

        const events = await prisma.event.findMany({
            where,
            orderBy: { eventDate: 'asc' },
            include: {
                host: true,
                bookings: { select: { status: true } },
            }
        });

        let mappedEvents = events.map(this.mapToDomain);

        const city = filters?.city;
        if (city) {
            mappedEvents = mappedEvents.filter((event) => isEventInCity(event.city || event.location, city));
        }

        if (
            filters?.latitude !== undefined &&
            filters.longitude !== undefined &&
            filters.radiusInKm !== undefined
        ) {
            return filterAndSortEventsByProximity(
                mappedEvents,
                { latitude: filters.latitude, longitude: filters.longitude },
                filters.radiusInKm
            );
        }

        return mappedEvents;
    }

    async findById(id: string): Promise<Event | null> {
        const event = await prisma.event.findUnique({
            where: { id },
            include: {
                bookings: { include: { payment: { select: { status: true } } } },
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
        
        return this.mapToDomain(event);
    }

    async findByCreationKey(creationKey: string): Promise<Event | null> {
        const event = await prisma.event.findUnique({
            where: { creationKey },
            include: {
                bookings: { include: { payment: { select: { status: true } } } },
                host: true,
                dishes: { orderBy: { order: 'asc' } },
                questions: { orderBy: { order: 'asc' } },
            },
        });
        return event ? this.mapToDomain(event) : null;
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
        if (eventData.city !== undefined) updateData.city = eventData.city;
        if (eventData.state !== undefined) updateData.state = eventData.state;
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
        if (eventData.isServedInSequence !== undefined) updateData.isServedInSequence = eventData.isServedInSequence;
        if (eventData.accessType !== undefined) {
            updateData.accessType = eventData.accessType;
            updateData.requiresApproval = eventData.accessType === 'OPEN_WITH_APPROVAL';
        }
        if (eventData.allowWaitlist !== undefined) updateData.allowWaitlist = eventData.allowWaitlist;
        if (eventData.autoApproveIfAttended !== undefined) updateData.autoApproveIfAttended = eventData.autoApproveIfAttended;
        if (eventData.autoApproveMinRating !== undefined) updateData.autoApproveMinRating = eventData.autoApproveMinRating;

        return prisma.$transaction(async (tx) => {
        // Replace dishes if provided
        if (dishes !== undefined) {
            await tx.eventDish.deleteMany({ where: { eventId: id } });
            if (dishes.length > 0) {
                await tx.eventDish.createMany({
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
            await tx.eventQuestion.deleteMany({ where: { eventId: id } });
            if (questions.length > 0) {
                await tx.eventQuestion.createMany({
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

        const event = await tx.event.update({
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
        });
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
            city: prismaEvent.city ?? null,
            state: prismaEvent.state ?? null,
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
            isServedInSequence: prismaEvent.isServedInSequence ?? false,
            creationKey: prismaEvent.creationKey ?? null,
            hostId: prismaEvent.hostId,
            accessType: prismaEvent.accessType,
            requiresApproval: prismaEvent.requiresApproval,
            allowWaitlist: prismaEvent.allowWaitlist,
            autoApproveIfAttended: prismaEvent.autoApproveIfAttended,
            autoApproveMinRating: prismaEvent.autoApproveMinRating?.toNumber() || null,
            createdAt: prismaEvent.createdAt,
            updatedAt: prismaEvent.updatedAt ?? prismaEvent.updated_at,
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
                paymentDueAt: b.paymentDueAt,
                attendedBefore: b.attendedBefore,
                noShowCount: b.noShowCount,
                createdAt: b.createdAt,
                updatedAt: b.updatedAt,
                paymentStatus: b.payment?.status,
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
        
        return mapped;
    }
}

