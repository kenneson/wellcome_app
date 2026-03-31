import { UserRepository } from '../../domain/repositories/UserRepository';
import { WithdrawalRequest, WithdrawalRequestRepository } from '../../domain/repositories/WithdrawalRequestRepository';

export class RequestWithdrawalUseCase {
    constructor(
        private userRepository: UserRepository,
        private withdrawalRequestRepository: WithdrawalRequestRepository
    ) {}

    async execute(userId: string, amount: number): Promise<WithdrawalRequest> {
        if (amount <= 0) {
            throw new Error('O valor do saque deve ser maior que zero');
        }

        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error('Usuário não encontrado');
        }

        if (!user.pixKey) {
            throw new Error('Usuário não possui uma chave PIX cadastrada para realizar o saque');
        }

        if (Number(user.walletBalance || 0) < amount) {
            throw new Error('Saldo insuficiente para realizar este saque');
        }

        // 1. Criar o pedido de saque
        const withdrawalRequest = await this.withdrawalRequestRepository.create({
            userId,
            amount,
            pixKey: user.pixKey,
            pixKeyType: user.pixKeyType,
        });

        // 2. Debitar da carteira do usuário imediatamente (-amount) usando a função existente
        await this.userRepository.addWalletBalance(
            userId,
            -Math.abs(amount),
            withdrawalRequest.id
        );

        return withdrawalRequest;
    }
}
