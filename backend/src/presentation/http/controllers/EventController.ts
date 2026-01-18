import { FastifyReply, FastifyRequest } from 'fastify';
import { CreateEventUseCase } from '../../../application/use-cases/CreateEventUseCase';
import { ListEventsUseCase } from '../../../application/use-cases/ListEventsUseCase';
import { z } from 'zod';

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
    hostId: z.string()
});

export class EventController {
    constructor(
        private createEventUseCase: CreateEventUseCase,
        private listEventsUseCase: ListEventsUseCase
    ) { }

    async create(request: FastifyRequest, reply: FastifyReply) {
        try {
            const body = createEventSchema.parse(request.body);
            const event = await this.createEventUseCase.execute(body);
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
            const { lat, lon, radius } = request.query as { lat?: string; lon?: string; radius?: string };
            const events = await this.listEventsUseCase.execute({
                latitude: lat ? parseFloat(lat) : undefined,
                longitude: lon ? parseFloat(lon) : undefined,
                radiusInKm: radius ? parseFloat(radius) : undefined
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
