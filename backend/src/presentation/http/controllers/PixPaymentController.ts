import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { CheckPixPaymentUseCase } from '../../../application/use-cases/CheckPixPaymentUseCase';
import { CreatePixChargeUseCase } from '../../../application/use-cases/CreatePixChargeUseCase';
import { UnauthorizedRequestError, getAuthenticatedUserId } from '../helpers/auth';

const isProd = process.env.NODE_ENV === 'production';

const createPixChargeSchema = z.object({
    bookingId: z.string().uuid(),
    eventId: z.string().uuid(),
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
            const userId = await getAuthenticatedUserId(request);
            if (!isProd) console.log('[PixPaymentController] Creating PIX charge');
            const result = await this.createPixChargeUseCase.execute({ ...body, userId });
            return reply.code(201).send(result);
        } catch (error: any) {
            if (!isProd) console.error('[PixPaymentController] Error:', error?.message || error);
            if (error instanceof UnauthorizedRequestError) {
                return reply.code(401).send({ message: error.message });
            }
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ message: 'Dados invalidos', errors: error.issues });
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
            return reply.code(500).send({ message: error?.message || 'Erro ao gerar cobranca PIX' });
        }
    }

    async checkPayment(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { bookingId } = checkPaymentSchema.parse(request.params);
            const result = await this.checkPixPaymentUseCase.execute(bookingId);
            return reply.send(result);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ message: 'Dados invalidos' });
            }
            if (error.message === 'Payment not found for this booking') {
                return reply.code(404).send({ message: error.message });
            }
            if (!isProd) console.error('Error checking PIX payment:', error);
            return reply.code(500).send({ message: 'Erro ao consultar pagamento' });
        }
    }
}
