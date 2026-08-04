import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AddPaymentCardUseCase } from '../../../application/use-cases/AddPaymentCardUseCase';
import { GetBillingWalletUseCase } from '../../../application/use-cases/GetBillingWalletUseCase';
import {
    DeletePaymentCardUseCase,
    SetDefaultPaymentCardUseCase,
} from '../../../application/use-cases/ManagePaymentCardUseCases';
import { SaveBillingProfileUseCase } from '../../../application/use-cases/SaveBillingProfileUseCase';
import { PaymentGatewayError } from '../../../domain/services/PaymentGateway';
import { UnauthorizedRequestError, getAuthenticatedUserId } from '../helpers/auth';

const profileSchema = z.object({
    fullName: z.string().min(3).max(120),
    cpfCnpj: z.string().min(11).max(18),
    email: z.string().email().max(160),
    mobilePhone: z.string().min(10).max(20),
    postalCode: z.string().max(10).optional(),
    addressNumber: z.string().max(20).optional(),
    addressComplement: z.string().max(80).optional(),
});

const cardSchema = z.object({
    holderName: z.string().min(3).max(120),
    number: z.string().min(13).max(24),
    expiryMonth: z.number().int().min(1).max(12),
    expiryYear: z.number().int().min(2020).max(2200),
    ccv: z.string().min(3).max(4),
    isDefault: z.boolean().optional(),
});

const cardParamsSchema = z.object({ cardId: z.string().uuid() });

export class BillingController {
    constructor(
        private getWalletUseCase: GetBillingWalletUseCase,
        private saveProfileUseCase: SaveBillingProfileUseCase,
        private addCardUseCase: AddPaymentCardUseCase,
        private deleteCardUseCase: DeletePaymentCardUseCase,
        private setDefaultCardUseCase: SetDefaultPaymentCardUseCase
    ) {}

    async getWallet(request: FastifyRequest, reply: FastifyReply) {
        try {
            const userId = await getAuthenticatedUserId(request);
            return reply.send(await this.getWalletUseCase.execute(userId));
        } catch (error) {
            return this.handleError(request, reply, error, 'Falha ao carregar pagamentos');
        }
    }

    async saveProfile(request: FastifyRequest, reply: FastifyReply) {
        try {
            const userId = await getAuthenticatedUserId(request);
            const body = profileSchema.parse(request.body);
            return reply.send(await this.saveProfileUseCase.execute(userId, body));
        } catch (error) {
            return this.handleError(request, reply, error, 'Falha ao salvar dados de cobranca');
        }
    }

    async addCard(request: FastifyRequest, reply: FastifyReply) {
        try {
            const userId = await getAuthenticatedUserId(request);
            const body = cardSchema.parse(request.body);
            const card = await this.addCardUseCase.execute(userId, body, request.ip);
            return reply.code(201).send(card);
        } catch (error) {
            return this.handleError(request, reply, error, 'Falha ao cadastrar cartao');
        }
    }

    async deleteCard(request: FastifyRequest, reply: FastifyReply) {
        try {
            const userId = await getAuthenticatedUserId(request);
            const { cardId } = cardParamsSchema.parse(request.params);
            await this.deleteCardUseCase.execute(userId, cardId);
            return reply.code(204).send();
        } catch (error) {
            return this.handleError(request, reply, error, 'Falha ao remover cartao');
        }
    }

    async setDefaultCard(request: FastifyRequest, reply: FastifyReply) {
        try {
            const userId = await getAuthenticatedUserId(request);
            const { cardId } = cardParamsSchema.parse(request.params);
            return reply.send(await this.setDefaultCardUseCase.execute(userId, cardId));
        } catch (error) {
            return this.handleError(request, reply, error, 'Falha ao atualizar cartao');
        }
    }

    private handleError(
        request: FastifyRequest,
        reply: FastifyReply,
        error: unknown,
        fallback: string
    ) {
        if (error instanceof UnauthorizedRequestError) {
            return reply.code(401).send({ message: error.message });
        }
        if (error instanceof z.ZodError) {
            return reply.code(400).send({ message: 'Dados invalidos', errors: error.issues });
        }

        const message = error instanceof Error ? error.message : fallback;
        if (message === 'Cartao nao encontrado') return reply.code(404).send({ message });
        if (
            message.includes('invalido') ||
            message.includes('Informe') ||
            message.includes('Complete')
        ) {
            return reply.code(400).send({ message });
        }
        if (error instanceof PaymentGatewayError) {
            request.log.warn({ statusCode: error.statusCode, code: error.code }, 'Asaas billing request rejected');
            return reply.code(error.isDefinitiveClientError ? 422 : 502).send({
                message: error.isDefinitiveClientError ? error.message : fallback,
            });
        }

        request.log.error(error, fallback);
        return reply.code(500).send({ message: fallback });
    }
}
