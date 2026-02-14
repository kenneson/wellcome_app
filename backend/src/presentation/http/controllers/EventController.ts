import { FastifyReply, FastifyRequest } from 'fastify';
import { CreateEventUseCase } from '../../../application/use-cases/CreateEventUseCase';
import { ListEventsUseCase } from '../../../application/use-cases/ListEventsUseCase';
import { UpdateEventUseCase } from '../../../application/use-cases/UpdateEventUseCase';
import { DeleteEventUseCase } from '../../../application/use-cases/DeleteEventUseCase';
import { z } from 'zod';

import { EventAccessType } from '../../../domain/value-objects/EventAccessType';

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
    hostId: z.string(),
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
            
            // Debug logging
            console.log('[DEBUG] EventController.create - Parsed body:');
            console.log('  - endTime:', body.endTime);
            console.log('  - reservationDeadline:', body.reservationDeadline);
            console.log('  - dishes count:', body.dishes?.length || 0);
            console.log('  - dishes:', JSON.stringify(body.dishes));
            
            const event = await this.createEventUseCase.execute({
                ...body,
                eventType: body.eventType ?? '',
                cuisineTypes: body.cuisineTypes ?? [],
                vibe: body.vibe ?? [],
                facilities: body.facilities ?? [],
                rules: body.rules ?? [],
                imageGallery: body.imageGallery ?? [],
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
            
            console.log('[DEBUG] EventController.create - Returned event:');
            console.log('  - endTime:', event.endTime);
            console.log('  - reservationDeadline:', event.reservationDeadline);
            console.log('  - dishes count:', event.dishes?.length || 0);
            console.log('  - host fullName:', event.host?.fullName);
            console.log('  - host avatarUrl:', event.host?.avatarUrl);
            
            return reply.code(201).send(event);
        } catch (error) {
            console.error('Create Event Error:', error);
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ message: 'Validation error', errors: error.issues });
            }
            return reply.code(500).send({ message: 'Internal server error', error });
        }
    }

    async list(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { lat, lon, radius, cuisine, vibe, priceMin, priceMax, eventType } = request.query as any;
            const events = await this.listEventsUseCase.execute({
                latitude: lat ? parseFloat(lat) : undefined,
                longitude: lon ? parseFloat(lon) : undefined,
                radiusInKm: radius ? parseFloat(radius) : undefined,
                cuisine: cuisine ? (Array.isArray(cuisine) ? cuisine : [cuisine]) : undefined,
                vibe: vibe ? (Array.isArray(vibe) ? vibe : [vibe]) : undefined,
                priceMin: priceMin ? parseFloat(priceMin) : undefined,
                priceMax: priceMax ? parseFloat(priceMax) : undefined,
                eventType: eventType ? (Array.isArray(eventType) ? eventType[0] : eventType) : undefined
            });
            return reply.send(events);
        } catch (error) {
            return reply.code(500).send({ message: 'Internal server error', error });
        }
    }

    async getById(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        try {
            console.log('[DEBUG] EventController.getById - Fetching event:', id);
            const event = await this.listEventsUseCase.getById(id);
            if (!event) {
                console.log('[DEBUG] EventController.getById - Event not found');
                return reply.code(404).send({ message: 'Event not found' });
            }
            return reply.send(event);
        } catch (error) {
            return reply.code(500).send({ message: 'Internal server error', error });
        }
    }

    async update(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        try {
            const body = updateEventSchema.parse(request.body);
            const { hostId, ...updateData } = body;
            const event = await this.updateEventUseCase.execute(id, hostId, updateData);
            return reply.send(event);
        } catch (error) {
            console.error('Update Event Error:', error);
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
            return reply.code(500).send({ message: 'Internal server error', error });
        }
    }

    async delete(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const { hostId } = request.body as { hostId: string };
        try {
            if (!hostId) {
                return reply.code(400).send({ message: 'hostId is required' });
            }
            await this.deleteEventUseCase.execute(id, hostId);
            return reply.code(204).send();
        } catch (error) {
            console.error('Delete Event Error:', error);
            if (error instanceof Error) {
                if (error.message === 'Event not found') {
                    return reply.code(404).send({ message: error.message });
                }
                if (error.message === 'Only the host can delete this event') {
                    return reply.code(403).send({ message: error.message });
                }
            }
            return reply.code(500).send({ message: 'Internal server error', error });
        }
    }
}
