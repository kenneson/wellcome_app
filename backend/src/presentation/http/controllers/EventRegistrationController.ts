import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ApproveRegistrationUseCase } from '../../../application/use-cases/ApproveRegistrationUseCase';
import { CancelEventRegistrationUseCase } from '../../../application/use-cases/CancelEventRegistrationUseCase';
import { JoinEventUseCase } from '../../../application/use-cases/JoinEventUseCase';
import { RejectRegistrationUseCase } from '../../../application/use-cases/RejectRegistrationUseCase';
import { EventRegistrationRepository } from '../../../domain/repositories/EventRegistrationRepository';
import { UnauthorizedRequestError, getAuthenticatedUserId } from '../helpers/auth';

const createRegistrationSchema = z.object({
    eventId: z.string(),
    answers: z.array(z.object({
        questionId: z.string(),
        answer: z.string()
    })).optional()
});

const approveRejectSchema = z.object({
    registrationId: z.string(),
    reason: z.string().optional()
});

const validateTicketSchema = z.object({
    bookingId: z.string().uuid()
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
            const userId = await getAuthenticatedUserId(request);
            const registration = await this.joinEventUseCase.execute({ ...body, userId });
            return reply.code(201).send(registration);
        } catch (error: any) {
            if (error instanceof UnauthorizedRequestError) {
                return reply.code(401).send({ message: error.message });
            }
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
            const { eventId } = request.body as { eventId: string };
            if (!eventId) {
                return reply.code(400).send({ message: 'eventId is required' });
            }
            const userId = await getAuthenticatedUserId(request);
            await this.cancelEventRegistrationUseCase.execute(eventId, userId);
            return reply.code(204).send();
        } catch (error) {
            if (error instanceof UnauthorizedRequestError) {
                return reply.code(401).send({ message: error.message });
            }
            return reply.code(500).send({ message: 'Internal server error', error });
        }
    }

    async approve(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { registrationId } = approveRejectSchema.parse(request.body);
            const hostId = await getAuthenticatedUserId(request);
            const registration = await this.approveRegistrationUseCase.execute(registrationId, hostId);
            return reply.send(registration);
        } catch (error) {
            if (error instanceof UnauthorizedRequestError) {
                return reply.code(401).send({ message: error.message });
            }
            return reply.code(500).send({ message: 'Internal server error', error });
        }
    }

    async reject(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { registrationId, reason } = approveRejectSchema.parse(request.body);
            const hostId = await getAuthenticatedUserId(request);
            if (!reason) {
                return reply.code(400).send({ message: 'Reason is required for rejection' });
            }
            const registration = await this.rejectRegistrationUseCase.execute(registrationId, hostId, reason);
            return reply.send(registration);
        } catch (error) {
            if (error instanceof UnauthorizedRequestError) {
                return reply.code(401).send({ message: error.message });
            }
            return reply.code(500).send({ message: 'Internal server error', error });
        }
    }

    async validateTicket(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { bookingId } = validateTicketSchema.parse(request.body);
            const hostId = await getAuthenticatedUserId(request);

            const registration = await this.eventRegistrationRepository.findById(bookingId);

            if (!registration) {
                return reply.code(404).send({ valid: false, message: 'Ingresso nao encontrado' });
            }

            if (registration.event?.hostId !== hostId) {
                return reply.code(403).send({ valid: false, message: 'Voce nao e o anfitriao deste evento' });
            }

            if (registration.status !== 'APPROVED') {
                return reply.code(400).send({ valid: false, message: `Inscricao com status: ${registration.status}` });
            }

            return reply.send({
                valid: true,
                message: 'Ingresso valido!',
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
            if (error instanceof UnauthorizedRequestError) {
                return reply.code(401).send({ valid: false, message: error.message });
            }
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ valid: false, message: 'Dados invalidos' });
            }
            return reply.code(500).send({ valid: false, message: 'Erro interno' });
        }
    }
}
