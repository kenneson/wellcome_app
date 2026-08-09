import { UserRepository } from '../../domain/repositories/UserRepository';
import { WithdrawalRequest, WithdrawalRequestRepository } from '../../domain/repositories/WithdrawalRequestRepository';
import { normalizePixKey } from '../../domain/services/PixKeyValidation';

export class RequestWithdrawalUseCase {
    constructor(
        private userRepository: UserRepository,
        private withdrawalRequestRepository: WithdrawalRequestRepository
    ) {}

    async execute(userId: string, amount: number): Promise<WithdrawalRequest> {
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error('O valor do saque deve ser maior que zero');
        }
        const normalizedAmount = Number(amount.toFixed(2));
        if (Math.abs(normalizedAmount - amount) >= 0.001) {
            throw new Error('O valor do saque deve ter no maximo duas casas decimais');
        }

        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error('Usuario nao encontrado');
        }

        if (!user.pixKey) {
            throw new Error('Usuario nao possui uma chave PIX cadastrada para realizar o saque');
        }

        if (user.kycStatus !== 'APPROVED') {
            throw new Error('A verificacao de identidade precisa estar aprovada antes do saque');
        }

        const pix = normalizePixKey(user.pixKey, user.pixKeyType);

        return this.withdrawalRequestRepository.createWithBalanceReservation({
            userId,
            amount: normalizedAmount,
            pixKey: pix.key,
            pixKeyType: pix.type,
        });
    }
}
