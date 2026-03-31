import { FastifyReply, FastifyRequest } from 'fastify';
import { RequestWithdrawalUseCase } from '../../../application/use-cases/RequestWithdrawalUseCase';
import { ApproveWithdrawalUseCase } from '../../../application/use-cases/ApproveWithdrawalUseCase';
import { z } from 'zod';

const requestWithdrawalSchema = z.object({
    userId: z.string().uuid(),
    amount: z.number().positive(),
});

export class WithdrawalController {
    constructor(
        private requestWithdrawalUseCase: RequestWithdrawalUseCase,
        private approveWithdrawalUseCase: ApproveWithdrawalUseCase,
        private withdrawalRepository: any
    ) {}

    async requestWithdrawal(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { userId, amount } = requestWithdrawalSchema.parse(request.body);
            const withdrawal = await this.requestWithdrawalUseCase.execute(userId, amount);
            return reply.code(201).send(withdrawal);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ message: 'Dados inválidos', errors: error.issues });
            }
            if (error.message.includes('não possui') || error.message.includes('Saldo insuficiente')) {
                return reply.code(400).send({ message: error.message });
            }
            if (error.message === 'Usuário não encontrado') {
                return reply.code(404).send({ message: error.message });
            }
            console.error('Error requesting withdrawal:', error);
            return reply.code(500).send({ message: 'Erro ao solicitar saque' });
        }
    }

    async approveWithdrawal(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { id } = request.params as { id: string };
            const withdrawal = await this.approveWithdrawalUseCase.execute(id);
            return reply.send(withdrawal);
        } catch (error: any) {
            if (error.message.includes('já foi processado') || error.message.includes('EFI')) {
                return reply.code(400).send({ message: error.message });
            }
            if (error.message === 'Pedido de saque não encontrado') {
                return reply.code(404).send({ message: error.message });
            }
            console.error('Error approving withdrawal:', error);
            return reply.code(500).send({ message: error?.message || 'Erro ao aprovar saque' });
        }
    }

    async listAll(request: FastifyRequest, reply: FastifyReply) {
        try {
            const withdrawals = await this.withdrawalRepository.findAll();
            return reply.send(withdrawals);
        } catch (error) {
            console.error('Error listing withdrawals:', error);
            return reply.code(500).send({ message: 'Erro ao listar saques' });
        }
    }
}
