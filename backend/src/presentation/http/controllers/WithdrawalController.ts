import { FastifyReply, FastifyRequest } from 'fastify';
import { RequestWithdrawalUseCase } from '../../../application/use-cases/RequestWithdrawalUseCase';
import { ApproveWithdrawalUseCase } from '../../../application/use-cases/ApproveWithdrawalUseCase';
import { z } from 'zod';
import { ForbiddenRequestError, UnauthorizedRequestError, getAuthenticatedUserId, requireAdminUser } from '../helpers/auth';

const requestWithdrawalSchema = z.object({
    amount: z.number().positive(),
});

export class WithdrawalController {
    constructor(
        private requestWithdrawalUseCase: RequestWithdrawalUseCase,
        private approveWithdrawalUseCase: ApproveWithdrawalUseCase,
        private withdrawalRepository: any,
        private efiPixService?: any
    ) {}

    async handleWebhook(_request: FastifyRequest, reply: FastifyReply) {
        console.log('[Webhook EFI] Notification received');
        return reply.code(200).send();
    }

    async setupWebhook(request: FastifyRequest, reply: FastifyReply) {
        if (!this.efiPixService) {
            return reply.code(500).send({ message: 'Servico EFI nao injetado' });
        }

        try {
            await requireAdminUser(request);
            const { url } = request.query as { url: string };
            if (!url) {
                return reply.code(400).send({ message: 'URL e obrigatoria. Use ?url=https://sua-url.com/webhook/pix' });
            }

            const result = await this.efiPixService.configWebhook(url);
            return reply.send({ success: true, result });
        } catch (error: any) {
            if (error instanceof UnauthorizedRequestError) {
                return reply.code(401).send({ message: error.message });
            }
            if (error instanceof ForbiddenRequestError) {
                return reply.code(403).send({ message: error.message });
            }
            return reply.code(500).send({ message: error.message || 'Erro ao configurar webhook' });
        }
    }

    async requestWithdrawal(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { amount } = requestWithdrawalSchema.parse(request.body);
            const userId = await getAuthenticatedUserId(request);
            const withdrawal = await this.requestWithdrawalUseCase.execute(userId, amount);
            return reply.code(201).send(withdrawal);
        } catch (error: any) {
            if (error instanceof UnauthorizedRequestError) {
                return reply.code(401).send({ message: error.message });
            }
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ message: 'Dados invalidos', errors: error.issues });
            }
            if (error.message.includes('nao possui') || error.message.includes('Saldo insuficiente')) {
                return reply.code(400).send({ message: error.message });
            }
            if (error.message === 'Usuario nao encontrado') {
                return reply.code(404).send({ message: error.message });
            }
            console.error('Error requesting withdrawal:', error);
            return reply.code(500).send({ message: 'Erro ao solicitar saque' });
        }
    }

    async approveWithdrawal(request: FastifyRequest, reply: FastifyReply) {
        try {
            await requireAdminUser(request);
            const { id } = request.params as { id: string };
            const withdrawal = await this.approveWithdrawalUseCase.execute(id);
            return reply.send(withdrawal);
        } catch (error: any) {
            if (error instanceof UnauthorizedRequestError) {
                return reply.code(401).send({ message: error.message });
            }
            if (error instanceof ForbiddenRequestError) {
                return reply.code(403).send({ message: error.message });
            }
            if (error.message.includes('ja foi processado') || error.message.includes('EFI')) {
                return reply.code(400).send({ message: error.message });
            }
            if (error.message === 'Pedido de saque nao encontrado') {
                return reply.code(404).send({ message: error.message });
            }
            console.error('Error approving withdrawal:', error);
            return reply.code(500).send({ message: error?.message || 'Erro ao aprovar saque' });
        }
    }

    async listAll(request: FastifyRequest, reply: FastifyReply) {
        try {
            await requireAdminUser(request);
            const withdrawals = await this.withdrawalRepository.findAll();
            return reply.send(withdrawals);
        } catch (error) {
            if (error instanceof UnauthorizedRequestError) {
                return reply.code(401).send({ message: error.message });
            }
            if (error instanceof ForbiddenRequestError) {
                return reply.code(403).send({ message: error.message });
            }
            console.error('Error listing withdrawals:', error);
            return reply.code(500).send({ message: 'Erro ao listar saques' });
        }
    }
}
