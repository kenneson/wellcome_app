import { UserRepository } from '../../domain/repositories/UserRepository';
import { WithdrawalRequest, WithdrawalRequestRepository } from '../../domain/repositories/WithdrawalRequestRepository';
import { EfiPixService } from '../../infrastructure/external/EfiPixService';

export class ApproveWithdrawalUseCase {
    constructor(
        private withdrawalRequestRepository: WithdrawalRequestRepository,
        private userRepository: UserRepository,
        private efiPixService: EfiPixService
    ) { }

    async execute(withdrawalId: string): Promise<WithdrawalRequest> {
        const withdrawal = await this.withdrawalRequestRepository.findById(withdrawalId);

        if (!withdrawal) {
            throw new Error('Pedido de saque não encontrado');
        }

        if (withdrawal.status !== 'PENDING' && withdrawal.status !== 'FAILED') {
            throw new Error(`Este saque já foi processado. Status atual: ${withdrawal.status}`);
        }

        // Marcar como PROCESSING
        await this.withdrawalRequestRepository.updateStatus(withdrawalId, 'PROCESSING');

        try {
            // 1. Chamar PIX Send da EFI
            const efiResponse = await this.efiPixService.sendPix(withdrawal.amount, withdrawal.pixKey, withdrawalId);

            // O efiResponse deve possuir o endToEndId se concluido com sucesso
            const efiEndToEndId = efiResponse.endToEndId || 'SUCCESS';

            // 2. Marcar COMPLETED
            const completedWithdrawal = await this.withdrawalRequestRepository.updateStatus(withdrawalId, 'COMPLETED', efiEndToEndId);
            return completedWithdrawal;

        } catch (error: any) {
            console.error('[ApproveWithdrawalUseCase] Erro ao enviar PIX:', error?.message);

            // Tentar extrair erro detalhado da EFI
            const detail = error?.response?.data?.mensagem || error?.response?.data?.error_description || error?.message;

            // Se falhou, voltar o status para FAILED e estornar o valor na carteira
            await this.withdrawalRequestRepository.updateStatus(withdrawalId, 'FAILED');

            await this.userRepository.addWalletBalance(
                withdrawal.userId,
                withdrawal.amount,
                withdrawal.id
            );

            throw new Error(`Erro EFI: ${detail}`);
        }
    }
}
