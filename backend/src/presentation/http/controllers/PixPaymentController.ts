import { FastifyReply, FastifyRequest } from 'fastify';
import { timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { CheckPixPaymentUseCase } from '../../../application/use-cases/CheckPixPaymentUseCase';
import { CreatePixChargeUseCase } from '../../../application/use-cases/CreatePixChargeUseCase';
import { UnauthorizedRequestError, getAuthenticatedUserId } from '../helpers/auth';

const createPixChargeSchema = z.object({
    bookingId: z.string().uuid(),
    eventId: z.string().uuid(),
});

const checkPaymentSchema = z.object({
    bookingId: z.string().uuid(),
});

const efiWebhookSchema = z.object({
    pix: z.array(z.object({ txid: z.string().min(1) })).min(1),
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
            console.log('[PixPaymentController] Creating PIX charge');
            const result = await this.createPixChargeUseCase.execute({ ...body, userId });
            return reply.code(201).send(result);
        } catch (error: any) {
            console.error('[PixPaymentController] Error:', error?.message || error);
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
            const userId = await getAuthenticatedUserId(request);
            const result = await this.checkPixPaymentUseCase.execute(bookingId, userId);
            return reply.send(result);
        } catch (error: any) {
            if (error instanceof UnauthorizedRequestError) {
                return reply.code(401).send({ message: error.message });
            }
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ message: 'Dados invalidos' });
            }
            if (error.message === 'Payment not found for this booking') {
                return reply.code(404).send({ message: error.message });
            }
            if (error.message === 'Payment does not belong to this user') {
                return reply.code(403).send({ message: 'Pagamento nao pertence a este usuario' });
            }
            console.error('Error checking PIX payment:', error);
            return reply.code(500).send({ message: 'Erro ao consultar pagamento' });
        }
    }

    async handleWebhook(request: FastifyRequest, reply: FastifyReply) {
        const expectedToken = process.env.EFI_WEBHOOK_TOKEN;
        const receivedToken = (request.params as { token?: string }).token;

        if (!expectedToken) {
            request.log.error('EFI_WEBHOOK_TOKEN is not configured');
            return reply.code(503).send({ message: 'Webhook indisponivel' });
        }

        if (!receivedToken || !this.hasMatchingWebhookToken(receivedToken, expectedToken)) {
            return reply.code(401).send({ message: 'Webhook nao autorizado' });
        }

        try {
            const body = efiWebhookSchema.parse(request.body);
            let confirmed = 0;

            for (const pix of body.pix) {
                try {
                    const result = await this.checkPixPaymentUseCase.executeByTxid(pix.txid);
                    if (result.paid) confirmed += 1;
                } catch (error: any) {
                    if (error?.message === 'Payment not found for this transaction') {
                        request.log.warn({ txid: pix.txid }, 'Ignoring unknown EFI PIX transaction');
                        continue;
                    }
                    throw error;
                }
            }

            return reply.code(200).send({ received: body.pix.length, confirmed });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ message: 'Payload de webhook invalido' });
            }
            request.log.error(error, 'Failed to process EFI webhook');
            return reply.code(500).send({ message: 'Falha ao processar webhook' });
        }
    }

    private hasMatchingWebhookToken(receivedToken: string, expectedToken: string): boolean {
        const received = Buffer.from(receivedToken);
        const expected = Buffer.from(expectedToken);
        return received.length === expected.length && timingSafeEqual(received, expected);
    }
}
