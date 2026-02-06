import { FastifyReply, FastifyRequest } from 'fastify';
import { CreateEventRegistrationUseCase } from '../../../application/use-cases/CreateEventRegistrationUseCase';
import { CancelEventRegistrationUseCase } from '../../../application/use-cases/CancelEventRegistrationUseCase';
import { z } from 'zod';

const createRegistrationSchema = z.object({
    eventId: z.string(),
    userId: z.string()
});

export class EventRegistrationController {
    constructor(
        private createEventRegistrationUseCase: CreateEventRegistrationUseCase,
        private cancelEventRegistrationUseCase: CancelEventRegistrationUseCase
    ) { }

    async create(request: FastifyRequest, reply: FastifyReply) {
        try {
            const body = createRegistrationSchema.parse(request.body);
            const registration = await this.createEventRegistrationUseCase.execute(body);
            return reply.code(201).send(registration);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ message: 'Validation error', errors: error.issues });
            }
            if (error.message === 'Event not found') {
                return reply.code(404).send({ message: error.message });
            }
            if (error.message === 'Event is full' || error.message === 'User already registered for this event') {
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
            await this.cancelEventRegistrationUseCase.execute(eventId, userId);
            return reply.code(204).send();
        } catch (error) {
            return reply.code(500).send({ message: 'Internal server error', error });
        }
    }
}
