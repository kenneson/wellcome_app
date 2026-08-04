import { UserRepository } from '../../domain/repositories/UserRepository';
import { WithdrawalRequest, WithdrawalRequestRepository } from '../../domain/repositories/WithdrawalRequestRepository';

export class RequestWithdrawalUseCase {
    constructor(
        private userRepository: UserRepository,
        private withdrawalRequestRepository: WithdrawalRequestRepository
    ) {}

    async execute(userId: string, amount: number): Promise<WithdrawalRequest> {
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error('O valor do saque deve ser maior que zero');
        }

        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error('Usuario nao encontrado');
        }

        if (!user.pixKey) {
            throw new Error('Usuario nao possui uma chave PIX cadastrada para realizar o saque');
        }

        return this.withdrawalRequestRepository.createWithBalanceReservation({
            userId,
            amount,
            pixKey: user.pixKey,
            pixKeyType: user.pixKeyType,
        });
    }
}
