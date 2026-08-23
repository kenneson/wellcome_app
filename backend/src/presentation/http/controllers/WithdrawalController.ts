import { FastifyReply, FastifyRequest } from 'fastify';
import { RequestWithdrawalUseCase } from '../../../application/use-cases/RequestWithdrawalUseCase';
import { ApproveWithdrawalUseCase } from '../../../application/use-cases/ApproveWithdrawalUseCase';
import { ReconcileWithdrawalUseCase } from '../../../application/use-cases/ReconcileWithdrawalUseCase';
import { z } from 'zod';
import { ForbiddenRequestError, UnauthorizedRequestError, getAuthenticatedUserId, requireAdminUser } from '../helpers/auth';
import { InvalidPixKeyError } from '../../../domain/services/PixKeyValidation';
import { PaymentGatewayError } from '../../../domain/services/PaymentGateway';

const requestWithdrawalSchema = z.object({
    amount: z.number().positive(),
});
const withdrawalIdSchema = z.object({ id: z.string().uuid() });

export class WithdrawalController {
    constructor(
        private requestWithdrawalUseCase: RequestWithdrawalUseCase,
        private approveWithdrawalUseCase: ApproveWithdrawalUseCase,
        private reconcileWithdrawalUseCase: ReconcileWithdrawalUseCase,
        private withdrawalRepository: any
    ) {}

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
            if (error instanceof InvalidPixKeyError) {
                return reply.code(400).send({ message: error.message });
            }
            if (
                error.message.includes('nao possui') ||
                error.message.includes('Saldo insuficiente') ||
                error.message.includes('duas casas') ||
                error.message.includes('valor minimo para saque') ||
                error.message.includes('verificacao de identidade') ||
                error.message.includes('Ja existe um saque')
            ) {
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
            const admin = await requireAdminUser(request);
            const { id } = withdrawalIdSchema.parse(request.params);
            const withdrawal = await this.approveWithdrawalUseCase.execute(id, admin.userId);
            return reply.code(withdrawal.status === 'PROCESSING' ? 202 : 200).send(withdrawal);
        } catch (error: any) {
            if (error instanceof UnauthorizedRequestError) {
                return reply.code(401).send({ message: error.message });
            }
            if (error instanceof ForbiddenRequestError) {
                return reply.code(403).send({ message: error.message });
            }
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ message: 'ID de saque invalido' });
            }
            if (
                error.message.includes('ja foi processado') ||
                error.message.includes('Asaas') ||
                error.message.includes('chave Pix') ||
                error.message.includes('processamento') ||
                error.message.includes('KYC') ||
                error.message.includes('mudou de estado')
            ) {
                return reply.code(422).send({ message: error.message });
            }
            if (error.message === 'Pedido de saque nao encontrado') {
                return reply.code(404).send({ message: error.message });
            }
            console.error('Error approving withdrawal:', error);
            return reply.code(500).send({ message: error?.message || 'Erro ao aprovar saque' });
        }
    }

    async reconcileWithdrawal(request: FastifyRequest, reply: FastifyReply) {
        try {
            await requireAdminUser(request);
            const { id } = withdrawalIdSchema.parse(request.params);
            return reply.send(await this.reconcileWithdrawalUseCase.execute(id));
        } catch (error) {
            if (error instanceof UnauthorizedRequestError) {
                return reply.code(401).send({ message: error.message });
            }
            if (error instanceof ForbiddenRequestError) {
                return reply.code(403).send({ message: error.message });
            }
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ message: 'ID de saque invalido' });
            }
            if (error instanceof PaymentGatewayError) {
                request.log.error({ statusCode: error.statusCode, code: error.code }, 'Asaas payout reconciliation failed');
                return reply.code(502).send({ message: 'Nao foi possivel consultar a transferencia no Asaas' });
            }
            if (error instanceof Error && error.message === 'Pedido de saque nao encontrado') {
                return reply.code(404).send({ message: error.message });
            }
            if (error instanceof Error && error.message.includes('nao localizada')) {
                return reply.code(409).send({ message: error.message });
            }
            request.log.error(error, 'Withdrawal reconciliation failed');
            return reply.code(500).send({ message: 'Erro ao conciliar saque' });
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
