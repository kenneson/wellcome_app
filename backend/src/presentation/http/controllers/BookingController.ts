import { FastifyReply, FastifyRequest } from 'fastify';
import { CreateBookingUseCase } from '../../../application/use-cases/CreateBookingUseCase';
import { CancelBookingUseCase } from '../../../application/use-cases/CancelBookingUseCase';
import { z } from 'zod';

const createBookingSchema = z.object({
    eventId: z.string(),
    userId: z.string()
});

export class BookingController {
    constructor(
        private createBookingUseCase: CreateBookingUseCase,
        private cancelBookingUseCase: CancelBookingUseCase
    ) { }

    async create(request: FastifyRequest, reply: FastifyReply) {
        try {
            const body = createBookingSchema.parse(request.body);
            const booking = await this.createBookingUseCase.execute(body);
            return reply.code(201).send(booking);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ message: 'Validation error', errors: error.issues });
            }
            if (error.message === 'Event not found') {
                return reply.code(404).send({ message: error.message });
            }
            if (error.message === 'Event is full' || error.message === 'User already booked for this event') {
                return reply.code(409).send({ message: error.message });
            }
            return reply.code(500).send({ message: 'Internal server error', error });
        }
    }

    async delete(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { eventId, userId } = request.body as { eventId: string; userId: string };
            if (!eventId || !userId) {
                return reply.code(400).send({ message: 'eventId and userId are required' });
            }
            await this.cancelBookingUseCase.execute(eventId, userId);
            return reply.code(204).send();
        } catch (error) {
            return reply.code(500).send({ message: 'Internal server error', error });
        }
    }
}
