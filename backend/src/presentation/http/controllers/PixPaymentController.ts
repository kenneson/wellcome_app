import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { CheckPixPaymentUseCase } from '../../../application/use-cases/CheckPixPaymentUseCase';
import { CreatePixChargeUseCase } from '../../../application/use-cases/CreatePixChargeUseCase';

const createPixChargeSchema = z.object({
    bookingId: z.string().uuid(),
    eventId: z.string().uuid(),
    userId: z.string().uuid(),
});

const checkPaymentSchema = z.object({
    bookingId: z.string().uuid(),
});

export class PixPaymentController {
    constructor(
        private createPixChargeUseCase: CreatePixChargeUseCase,
        private checkPixPaymentUseCase: CheckPixPaymentUseCase
    ) {}

    async createCharge(request: FastifyRequest, reply: FastifyReply) {
        try {
            const body = createPixChargeSchema.parse(request.body);
            const result = await this.createPixChargeUseCase.execute(body);
            return reply.code(201).send(result);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ message: 'Dados inválidos', errors: error.issues });
            }
            if (error.message === 'Event not found' || error.message === 'Booking not found') {
                return reply.code(404).send({ message: error.message });
            }
            if (error.message === 'Event has no price set') {
                return reply.code(400).send({ message: error.message });
            }
            if (error.message === 'Payment already confirmed') {
                return reply.code(409).send({ message: error.message });
            }
            if (error.message === 'Booking does not belong to this user') {
                return reply.code(403).send({ message: error.message });
            }
            console.error('Error creating PIX charge:', error);
            return reply.code(500).send({ message: 'Erro ao gerar cobrança PIX' });
        }
    }

    async checkPayment(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { bookingId } = checkPaymentSchema.parse(request.params);
            const result = await this.checkPixPaymentUseCase.execute(bookingId);
            return reply.send(result);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ message: 'Dados inválidos' });
            }
            if (error.message === 'Payment not found for this booking') {
                return reply.code(404).send({ message: error.message });
            }
            console.error('Error checking PIX payment:', error);
            return reply.code(500).send({ message: 'Erro ao consultar pagamento' });
        }
    }
}
