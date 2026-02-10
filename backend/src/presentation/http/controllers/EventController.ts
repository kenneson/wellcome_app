import { FastifyReply, FastifyRequest } from 'fastify';
import { CreateEventUseCase } from '../../../application/use-cases/CreateEventUseCase';
import { ListEventsUseCase } from '../../../application/use-cases/ListEventsUseCase';
import { z } from 'zod';

import { EventAccessType } from '../../../domain/value-objects/EventAccessType';

const createEventSchema = z.object({
    title: z.string(),
    description: z.string(),
    price: z.number(),
    maxGuests: z.number(),
    eventDate: z.string().transform((str) => new Date(str)),
    location: z.string(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    coverImageUrl: z.string().nullable(),
    hostId: z.string(),
    eventType: z.string().optional(),
    cuisineTypes: z.array(z.string()).optional(),
    vibe: z.array(z.string()).optional(),
    facilities: z.array(z.string()).optional(),
    rules: z.array(z.string()).optional(),
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
    })).optional()
});

export class EventController {
    constructor(
        private createEventUseCase: CreateEventUseCase,
        private listEventsUseCase: ListEventsUseCase
    ) { }

    async create(request: FastifyRequest, reply: FastifyReply) {
        try {
            const body = createEventSchema.parse(request.body);
            const event = await this.createEventUseCase.execute({
                ...body,
                eventType: body.eventType ?? '', // Use empty string if null, assuming schema expects string
                cuisineTypes: body.cuisineTypes ?? [],
                vibe: body.vibe ?? [],
                facilities: body.facilities ?? [],
                rules: body.rules ?? [],
                questions: body.questions?.map((q, index) => ({
                    ...q,
                    order: index
                })) ?? []
            });
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
            const event = await this.listEventsUseCase.getById(id);
            if (!event) {
                return reply.code(404).send({ message: 'Event not found' });
            }
            return reply.send(event);
        } catch (error) {
            return reply.code(500).send({ message: 'Internal server error', error });
        }
    }
}
