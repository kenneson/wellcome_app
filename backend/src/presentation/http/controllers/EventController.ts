import { FastifyReply, FastifyRequest } from 'fastify';
import { CreateEventUseCase } from '../../../application/use-cases/CreateEventUseCase';
import { ListEventsUseCase } from '../../../application/use-cases/ListEventsUseCase';
import { UpdateEventUseCase } from '../../../application/use-cases/UpdateEventUseCase';
import { DeleteEventUseCase } from '../../../application/use-cases/DeleteEventUseCase';
import { z } from 'zod';

import { EventAccessType } from '../../../domain/value-objects/EventAccessType';
import { UnauthorizedRequestError, getAuthenticatedUserId, getOptionalAuthenticatedUserContext } from '../helpers/auth';

const createEventSchema = z.object({
    title: z.string(),
    description: z.string(),
    price: z.number(),
    maxGuests: z.number(),
    eventDate: z.string().transform((str) => new Date(str)),
    endTime: z.string().transform((str) => new Date(str)).optional().nullable(),
    reservationDeadline: z.string().transform((str) => new Date(str)).optional().nullable(),
    location: z.string(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    coverImageUrl: z.string().nullable(),
    imageGallery: z.array(z.string()).optional().default([]),
    hostId: z.string(),
    eventType: z.string().optional(),
    cuisineTypes: z.array(z.string()).optional(),
    vibe: z.array(z.string()).optional(),
    facilities: z.array(z.string()).optional(),
    rules: z.array(z.string()).optional(),
    dietaryOptions: z.array(z.string()).optional().default([]),
    // Approval fields
    accessType: z.nativeEnum(EventAccessType).optional().default(EventAccessType.OPEN),
    requiresApproval: z.boolean().optional().default(false),
    allowWaitlist: z.boolean().optional().default(false),
    autoApproveIfAttended: z.boolean().optional().default(false),
    autoApproveMinRating: z.number().nullable().optional().default(null),
    questions: z.array(z.object({
        question: z.string(),
        questionType: z.string(),
        required: z.boolean(),
        options: z.array(z.string()).optional()
    })).optional(),
    dishes: z.array(z.object({
        name: z.string(),
        description: z.string().optional(),
        category: z.string(),
        order: z.number().optional().default(0)
    })).optional()
});

const updateEventSchema = z.object({
    title: z.string().optional(),
    description: z.string().nullable().optional(),
    price: z.number().optional(),
    maxGuests: z.number().optional(),
    eventDate: z.string().transform((str) => new Date(str)).optional(),
    endTime: z.string().transform((str) => new Date(str)).optional().nullable(),
    reservationDeadline: z.string().transform((str) => new Date(str)).optional().nullable(),
    location: z.string().optional(),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    coverImageUrl: z.string().nullable().optional(),
    imageGallery: z.array(z.string()).optional(),
    eventType: z.string().nullable().optional(),
    cuisineTypes: z.array(z.string()).optional(),
    vibe: z.array(z.string()).optional(),
    facilities: z.array(z.string()).optional(),
    rules: z.array(z.string()).optional(),
    dietaryOptions: z.array(z.string()).optional(),
    accessType: z.nativeEnum(EventAccessType).optional(),
    requiresApproval: z.boolean().optional(),
    allowWaitlist: z.boolean().optional(),
    autoApproveIfAttended: z.boolean().optional(),
    autoApproveMinRating: z.number().nullable().optional(),
    questions: z.array(z.object({
        question: z.string(),
        questionType: z.string(),
        required: z.boolean(),
        options: z.array(z.string()).optional()
    })).optional(),
    dishes: z.array(z.object({
        name: z.string(),
        description: z.string().optional(),
        category: z.string(),
        order: z.number().optional()
    })).optional()
});

export class EventController {
    constructor(
        private createEventUseCase: CreateEventUseCase,
        private listEventsUseCase: ListEventsUseCase,
        private updateEventUseCase: UpdateEventUseCase,
        private deleteEventUseCase: DeleteEventUseCase
    ) { }

    async create(request: FastifyRequest, reply: FastifyReply) {
        try {
            const body = createEventSchema.parse(request.body);
            const hostId = await getAuthenticatedUserId(request);
            
            const event = await this.createEventUseCase.execute({
                ...body,
                eventType: body.eventType ?? '',
                cuisineTypes: body.cuisineTypes ?? [],
                vibe: body.vibe ?? [],
                facilities: body.facilities ?? [],
                rules: body.rules ?? [],
                imageGallery: body.imageGallery ?? [],
                hostId,
                dietaryOptions: body.dietaryOptions ?? [],
                endTime: body.endTime ?? null,
                reservationDeadline: body.reservationDeadline ?? null,
                questions: body.questions?.map((q, index) => ({
                    ...q,
                    order: index
                })) ?? [],
                dishes: body.dishes?.map((d, index) => ({
                    ...d,
                    order: d.order ?? index
                })) ?? []
            });
            
            return reply.code(201).send(this.serializeEvent(event, hostId));
        } catch (error) {
            console.error('Create Event Error:', error);
            if (error instanceof UnauthorizedRequestError) {
                return reply.code(401).send({ message: error.message });
            }
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ message: 'Validation error', errors: error.issues });
            }
            return reply.code(500).send({ message: 'Internal server error' });
        }
    }

    async list(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { lat, lon, radius, cuisine, vibe, priceMin, priceMax, eventType, excludeHostId } = request.query as any;
            const events = await this.listEventsUseCase.execute({
                latitude: lat !== undefined ? parseFloat(lat) : undefined,
                longitude: lon !== undefined ? parseFloat(lon) : undefined,
                radiusInKm: radius !== undefined ? parseFloat(radius) : undefined,
                cuisine: cuisine ? (Array.isArray(cuisine) ? cuisine : [cuisine]) : undefined,
                vibe: vibe ? (Array.isArray(vibe) ? vibe : [vibe]) : undefined,
                priceMin: priceMin ? parseFloat(priceMin) : undefined,
                priceMax: priceMax ? parseFloat(priceMax) : undefined,
                eventType: eventType ? (Array.isArray(eventType) ? eventType[0] : eventType) : undefined,
                excludeHostId: excludeHostId ? (Array.isArray(excludeHostId) ? excludeHostId[0] : excludeHostId) : undefined
            });
            return reply.send(events.map((event) => this.serializeEvent(event)));
        } catch (error) {
            return reply.code(500).send({ message: 'Internal server error' });
        }
    }

    async getById(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        try {
            const event = await this.listEventsUseCase.getById(id);
            if (!event) {
                return reply.code(404).send({ message: 'Event not found' });
            }
            const viewer = await getOptionalAuthenticatedUserContext(request);
            return reply.send(this.serializeEvent(event, viewer?.userId));
        } catch (error) {
            if (error instanceof UnauthorizedRequestError) {
                return reply.code(401).send({ message: error.message });
            }
            return reply.code(500).send({ message: 'Internal server error' });
        }
    }

    private serializeEvent(event: any, viewerId?: string) {
        const canSeeExactLocation = viewerId === event.hostId || event.bookings?.some(
            (booking: any) => booking.userId === viewerId && booking.status === 'APPROVED'
        );

        return {
            id: event.id,
            title: event.title,
            description: event.description,
            price: event.price,
            maxGuests: event.maxGuests,
            eventDate: event.eventDate,
            endTime: event.endTime,
            reservationDeadline: event.reservationDeadline,
            location: canSeeExactLocation ? event.location : this.getLocationSummary(event.location),
            latitude: canSeeExactLocation ? event.latitude : null,
            longitude: canSeeExactLocation ? event.longitude : null,
            coverImageUrl: event.coverImageUrl,
            imageGallery: event.imageGallery,
            eventType: event.eventType,
            cuisineTypes: event.cuisineTypes,
            vibe: event.vibe,
            facilities: event.facilities,
            rules: event.rules,
            dietaryOptions: event.dietaryOptions,
            hostId: event.hostId,
            accessType: event.accessType,
            requiresApproval: event.requiresApproval,
            allowWaitlist: event.allowWaitlist,
            autoApproveIfAttended: event.autoApproveIfAttended,
            autoApproveMinRating: event.autoApproveMinRating,
            createdAt: event.createdAt,
            updatedAt: event.updatedAt,
            host: event.host ? {
                id: event.host.id,
                fullName: event.host.fullName,
                username: event.host.username,
                avatarUrl: event.host.avatarUrl,
                isSuperhost: event.host.isSuperhost,
            } : undefined,
            dishes: event.dishes,
            questions: event.questions,
            reviews: event.reviews,
            participantCount: event.bookings?.filter(
                (booking: any) => booking.status === 'PENDING' || booking.status === 'APPROVED'
            ).length || 0,
        };
    }

    private getLocationSummary(location: string): string {
        return location ? 'Local exato informado apos a confirmacao' : 'Local informado apos a confirmacao';
    }

    async update(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        try {
            const body = updateEventSchema.parse(request.body);
            const hostId = await getAuthenticatedUserId(request);
            const updateData = body;
            const event = await this.updateEventUseCase.execute(id, hostId, updateData);
            return reply.send(this.serializeEvent(event, hostId));
        } catch (error) {
            console.error('Update Event Error:', error);
            if (error instanceof UnauthorizedRequestError) {
                return reply.code(401).send({ message: error.message });
            }
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ message: 'Validation error', errors: error.issues });
            }
            if (error instanceof Error) {
                if (error.message === 'Event not found') {
                    return reply.code(404).send({ message: error.message });
                }
                if (error.message === 'Only the host can update this event') {
                    return reply.code(403).send({ message: error.message });
                }
            }
            return reply.code(500).send({ message: 'Internal server error' });
        }
    }

    async delete(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        try {
            const hostId = await getAuthenticatedUserId(request);
            await this.deleteEventUseCase.execute(id, hostId);
            return reply.code(204).send();
        } catch (error) {
            console.error('Delete Event Error:', error);
            if (error instanceof UnauthorizedRequestError) {
                return reply.code(401).send({ message: error.message });
            }
            if (error instanceof Error) {
                if (error.message === 'Event not found') {
                    return reply.code(404).send({ message: error.message });
                }
                if (error.message === 'Only the host can delete this event') {
                    return reply.code(403).send({ message: error.message });
                }
            }
            return reply.code(500).send({ message: 'Internal server error' });
        }
    }
}
