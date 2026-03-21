import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ApproveRegistrationUseCase } from '../../../application/use-cases/ApproveRegistrationUseCase';
import { CancelEventRegistrationUseCase } from '../../../application/use-cases/CancelEventRegistrationUseCase';
import { JoinEventUseCase } from '../../../application/use-cases/JoinEventUseCase';
import { RejectRegistrationUseCase } from '../../../application/use-cases/RejectRegistrationUseCase';
import { EventRegistrationRepository } from '../../../domain/repositories/EventRegistrationRepository';

const createRegistrationSchema = z.object({
    eventId: z.string(),
    userId: z.string(),
    answers: z.array(z.object({
        questionId: z.string(),
        answer: z.string()
    })).optional()
});

const approveRejectSchema = z.object({
    registrationId: z.string(),
    hostId: z.string(), // In a real app this comes from auth token
    reason: z.string().optional()
});

const validateTicketSchema = z.object({
    bookingId: z.string().uuid(),
    hostId: z.string().uuid()
});

export class EventRegistrationController {
    constructor(
        private joinEventUseCase: JoinEventUseCase,
        private cancelEventRegistrationUseCase: CancelEventRegistrationUseCase,
        private approveRegistrationUseCase: ApproveRegistrationUseCase,
        private rejectRegistrationUseCase: RejectRegistrationUseCase,
        private eventRegistrationRepository: EventRegistrationRepository
    ) { }

    async create(request: FastifyRequest, reply: FastifyReply) {
        try {
            const body = createRegistrationSchema.parse(request.body);
            const registration = await this.joinEventUseCase.execute(body);
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
            if (error.message === 'Registration deadline has passed' || error.message === 'Host cannot join their own event') {
                return reply.code(400).send({ message: error.message });
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

    async approve(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { registrationId, hostId } = approveRejectSchema.parse(request.body);
            const registration = await this.approveRegistrationUseCase.execute(registrationId, hostId);
            return reply.send(registration);
        } catch (error) {
            return reply.code(500).send({ message: 'Internal server error', error });
        }
    }

    async reject(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { registrationId, hostId, reason } = approveRejectSchema.parse(request.body);
            if (!reason) {
                return reply.code(400).send({ message: 'Reason is required for rejection' });
            }
            const registration = await this.rejectRegistrationUseCase.execute(registrationId, hostId, reason);
            return reply.send(registration);
        } catch (error) {
            return reply.code(500).send({ message: 'Internal server error', error });
        }
    }

    async validateTicket(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { bookingId, hostId } = validateTicketSchema.parse(request.body);

            const registration = await this.eventRegistrationRepository.findById(bookingId);

            if (!registration) {
                return reply.code(404).send({ valid: false, message: 'Ingresso não encontrado' });
            }

            if (registration.event?.hostId !== hostId) {
                return reply.code(403).send({ valid: false, message: 'Você não é o anfitrião deste evento' });
            }

            if (registration.status !== 'APPROVED') {
                return reply.code(400).send({ valid: false, message: `Inscrição com status: ${registration.status}` });
            }

            return reply.send({
                valid: true,
                message: 'Ingresso válido!',
                booking: {
                    id: registration.id,
                    status: registration.status,
                    user: registration.user ? {
                        id: registration.user.id,
                        fullName: registration.user.fullName,
                        avatarUrl: registration.user.avatarUrl,
                    } : null,
                    event: registration.event ? {
                        id: registration.event.id,
                        title: registration.event.title,
                    } : null,
                }
            });
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ valid: false, message: 'Dados inválidos' });
            }
            return reply.code(500).send({ valid: false, message: 'Erro interno' });
        }
    }
}
