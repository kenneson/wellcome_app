import { UserRepository } from '../../domain/repositories/UserRepository';
import { WithdrawalRequest, WithdrawalRequestRepository } from '../../domain/repositories/WithdrawalRequestRepository';
import { PaymentGatewayError, PayoutGateway } from '../../domain/services/PaymentGateway';
import { normalizePixKey } from '../../domain/services/PixKeyValidation';

export class ApproveWithdrawalUseCase {
    constructor(
        private withdrawalRequestRepository: WithdrawalRequestRepository,
        private payoutGateway: PayoutGateway,
        private userRepository: UserRepository
    ) {}

    async execute(withdrawalId: string, approvedByAdminId: string): Promise<WithdrawalRequest> {
        const pending = await this.withdrawalRequestRepository.findById(withdrawalId);
        if (!pending) throw new Error('Pedido de saque nao encontrado');
        if (pending.status !== 'PENDING') throw new Error('Este saque ja foi processado');

        const host = await this.userRepository.findById(pending.userId);
        if (!host || host.kycStatus !== 'APPROVED') {
            throw new Error('O KYC do anfitriao precisa estar aprovado antes do repasse');
        }

        const withdrawal = await this.withdrawalRequestRepository.claimPending(
            withdrawalId,
            approvedByAdminId
        );
        if (!withdrawal) {
            throw new Error('O saque mudou de estado ou o KYC deixou de estar aprovado');
        }

        let pix;
        try {
            pix = normalizePixKey(withdrawal.pixKey, withdrawal.pixKeyType);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Chave Pix invalida';
            await this.withdrawalRequestRepository.failAndRefund(withdrawal.id, message);
            throw error;
        }

        try {
            const transfer = await this.payoutGateway.createPixTransfer({
                value: withdrawal.amount,
                pixAddressKey: pix.key,
                pixAddressKeyType: pix.type,
                externalReference: withdrawal.id,
                description: 'Repasse de anfitriao Wellcome',
            });

            if (transfer.status === 'FAILED' || transfer.status === 'CANCELLED') {
                await this.withdrawalRequestRepository.failAndRefund(
                    withdrawal.id,
                    transfer.failReason || 'Transferencia Pix recusada pelo Asaas'
                );
                throw new Error('Transferencia Pix recusada pelo Asaas');
            }

            return this.withdrawalRequestRepository.markSubmitted({
                id: withdrawal.id,
                providerTransferId: transfer.id,
                providerEndToEndId: transfer.endToEndIdentifier,
                providerStatus: transfer.status,
                status: transfer.status === 'DONE' ? 'COMPLETED' : 'PROCESSING',
            });
        } catch (error) {
            if (error instanceof PaymentGatewayError && !error.outcomeUncertain) {
                await this.withdrawalRequestRepository.failAndRefund(withdrawal.id, error.message);
                throw new Error(`Transferencia Pix rejeitada pelo Asaas: ${error.message}`);
            }
            if (error instanceof Error && error.message === 'Transferencia Pix recusada pelo Asaas') {
                throw error;
            }

            const message = error instanceof Error ? error.message : 'Resposta incerta do Asaas';
            console.error('[ApproveWithdrawalUseCase] Asaas response is uncertain:', message);
            return this.withdrawalRequestRepository.markSubmissionUncertain(withdrawal.id, message);
        }
    }
}
