import { timingSafeEqual } from 'crypto';
import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { CheckPaymentUseCase } from '../../../application/use-cases/CheckPaymentUseCase';
import { CreatePaymentCheckoutUseCase } from '../../../application/use-cases/CreatePaymentCheckoutUseCase';
import {
    AsaasWebhookPayload,
    HandleAsaasWebhookUseCase,
} from '../../../application/use-cases/HandleAsaasWebhookUseCase';
import { PaymentGatewayError } from '../../../domain/services/PaymentGateway';
import { INVALID_EVENT_PRICE_MESSAGE } from '../../../domain/constants/payments';
import { UnauthorizedRequestError, getAuthenticatedUserId } from '../helpers/auth';

const createCheckoutSchema = z.object({
    bookingId: z.string().uuid(),
    eventId: z.string().uuid(),
});

const checkPaymentSchema = z.object({
    bookingId: z.string().uuid(),
});

const webhookSchema = z.object({
    id: z.string().min(1),
    event: z.string().min(1),
    checkout: z.object({
        id: z.string().min(1),
        status: z.string().optional(),
    }).passthrough().optional(),
    payment: z.object({
        id: z.string().min(1),
        status: z.string().optional(),
        value: z.number().optional(),
        checkoutSession: z.string().nullable().optional(),
        refunds: z.array(z.object({
            status: z.string().optional(),
            value: z.number().optional(),
        }).passthrough()).optional(),
    }).passthrough().optional(),
    transfer: z.object({
        id: z.string().min(1),
        status: z.string().optional(),
        endToEndIdentifier: z.string().nullable().optional(),
    }).passthrough().optional(),
}).passthrough();

const checkoutReturnSchema = z.object({
    state: z.enum(['success', 'cancel', 'expired']),
});

const checkoutReturnQuerySchema = z.object({
    bookingId: z.string().uuid(),
    eventId: z.string().uuid(),
});

export class PaymentController {
    constructor(
        private createCheckoutUseCase: CreatePaymentCheckoutUseCase,
        private checkPaymentUseCase: CheckPaymentUseCase,
        private handleAsaasWebhookUseCase: HandleAsaasWebhookUseCase
    ) {}

    async createCheckout(request: FastifyRequest, reply: FastifyReply) {
        try {
            const body = createCheckoutSchema.parse(request.body);
            const userId = await getAuthenticatedUserId(request);
            const result = await this.createCheckoutUseCase.execute({ ...body, userId });
            return reply.code(201).send(result);
        } catch (error: any) {
            if (error instanceof UnauthorizedRequestError) {
                return reply.code(401).send({ message: error.message });
            }
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ message: 'Dados invalidos', errors: error.issues });
            }
            if (error.message === 'Event not found' || error.message === 'Booking not found') {
                return reply.code(404).send({ message: error.message });
            }
            if (error.message === 'Event has no price set' || error.message === INVALID_EVENT_PRICE_MESSAGE) {
                return reply.code(400).send({ message: error.message });
            }
            if (error.message === 'Payment already confirmed' || error.message === 'Payment cannot be reopened') {
                return reply.code(409).send({ message: error.message });
            }
            if (error.message === 'Payment checkout is being created') {
                return reply.code(409).send({ message: error.message });
            }
            if (error.message?.includes('does not belong')) {
                return reply.code(403).send({ message: error.message });
            }
            if (error instanceof PaymentGatewayError) {
                request.log.error({ statusCode: error.statusCode, code: error.code }, 'Asaas checkout failed');
                return reply.code(502).send({ message: 'Nao foi possivel iniciar o pagamento' });
            }
            request.log.error(error, 'Payment checkout creation failed');
            return reply.code(500).send({ message: error?.message || 'Erro ao iniciar pagamento' });
        }
    }

    async checkPayment(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { bookingId } = checkPaymentSchema.parse(request.params);
            const userId = await getAuthenticatedUserId(request);
            return reply.send(await this.checkPaymentUseCase.execute(bookingId, userId));
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
            request.log.error(error, 'Payment status check failed');
            return reply.code(500).send({ message: 'Erro ao consultar pagamento' });
        }
    }

    async handleWebhook(request: FastifyRequest, reply: FastifyReply) {
        const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
        const receivedToken = request.headers['asaas-access-token'];

        if (!expectedToken) {
            request.log.error('ASAAS_WEBHOOK_TOKEN is not configured');
            return reply.code(503).send({ message: 'Webhook indisponivel' });
        }
        if (typeof receivedToken !== 'string' || !this.hasMatchingToken(receivedToken, expectedToken)) {
            return reply.code(401).send({ message: 'Webhook nao autorizado' });
        }

        try {
            const payload = webhookSchema.parse(request.body) as AsaasWebhookPayload;
            const result = await this.handleAsaasWebhookUseCase.execute(payload);
            return reply.code(200).send({ received: true, ...result });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ message: 'Payload de webhook invalido' });
            }
            request.log.error(error, 'Asaas webhook processing failed');
            return reply.code(500).send({ message: 'Falha ao processar webhook' });
        }
    }

    async checkoutReturn(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { state } = checkoutReturnSchema.parse(request.params);
            const { bookingId, eventId } = checkoutReturnQuerySchema.parse(request.query);
            const content = this.renderReturnPage(state, bookingId, eventId);
            return reply.type('text/html; charset=utf-8').send(content);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return reply.code(400).type('text/plain').send('Retorno de pagamento invalido');
            }
            throw error;
        }
    }

    private hasMatchingToken(receivedToken: string, expectedToken: string): boolean {
        const received = Buffer.from(receivedToken);
        const expected = Buffer.from(expectedToken);
        return received.length === expected.length && timingSafeEqual(received, expected);
    }

    private renderReturnPage(state: 'success' | 'cancel' | 'expired', bookingId: string, eventId: string): string {
        const messages = {
            success: ['Pagamento enviado', 'A confirmacao aparecera no Wellcome em alguns instantes.'],
            cancel: ['Pagamento cancelado', 'Nenhuma cobranca foi confirmada.'],
            expired: ['Checkout expirado', 'Volte ao Wellcome para gerar um novo pagamento.'],
        } as const;
        const [title, message] = messages[state];
        const deepLink = `wellcome://events/${encodeURIComponent(eventId)}/payment?bookingId=${encodeURIComponent(bookingId)}`;

        return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <style>
    body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:#fff;color:#222;display:grid;min-height:100vh;place-items:center}
    main{max-width:420px;padding:32px;text-align:center}
    h1{font-size:24px;margin:0 0 12px}p{color:#666;line-height:1.5;margin:0 0 24px}
    a{display:inline-block;background:#ff8c42;color:#fff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:8px}
  </style>
</head>
<body><main><h1>${title}</h1><p>${message}</p><a href="${deepLink}">Voltar ao Wellcome</a></main></body>
</html>`;
    }
}
