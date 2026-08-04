import { WithdrawalRequest, WithdrawalRequestRepository } from '../../domain/repositories/WithdrawalRequestRepository';
import { PaymentGatewayError, PayoutGateway } from '../../domain/services/PaymentGateway';

export class ApproveWithdrawalUseCase {
    constructor(
        private withdrawalRequestRepository: WithdrawalRequestRepository,
        private payoutGateway: PayoutGateway
    ) {}

    async execute(withdrawalId: string): Promise<WithdrawalRequest> {
        const withdrawal = await this.withdrawalRequestRepository.claimPending(withdrawalId);

        if (!withdrawal) {
            throw new Error('Este saque ja foi processado ou nao existe');
        }

        const pixKeyType = this.getPixKeyType(withdrawal.pixKeyType);
        if (!pixKeyType) {
            await this.withdrawalRequestRepository.failAndRefund(withdrawal.id);
            throw new Error('Tipo de chave Pix invalido para transferencia Asaas');
        }

        try {
            const transfer = await this.payoutGateway.createPixTransfer({
                value: withdrawal.amount,
                pixAddressKey: withdrawal.pixKey,
                pixAddressKeyType: pixKeyType,
                externalReference: withdrawal.id,
                description: 'Saque Wellcome',
            });

            if (transfer.status === 'FAILED' || transfer.status === 'CANCELLED') {
                await this.withdrawalRequestRepository.failAndRefund(withdrawal.id);
                throw new Error('Transferencia Pix recusada pelo Asaas');
            }

            return this.withdrawalRequestRepository.markSubmitted({
                id: withdrawal.id,
                providerTransferId: transfer.id,
                providerEndToEndId: transfer.endToEndIdentifier,
                status: transfer.status === 'DONE' ? 'COMPLETED' : 'PROCESSING',
            });
        } catch (error: any) {
            if (error instanceof PaymentGatewayError && error.isDefinitiveClientError) {
                await this.withdrawalRequestRepository.failAndRefund(withdrawal.id);
                throw new Error(`Transferencia Pix rejeitada pelo Asaas: ${error.message}`);
            }
            if (error?.message === 'Transferencia Pix recusada pelo Asaas') {
                throw error;
            }
            console.error('[ApproveWithdrawalUseCase] Asaas response is uncertain:', error?.message);
            throw new Error('O envio Pix ficou em processamento e precisa ser conciliado antes de nova tentativa');
        }
    }

    private getPixKeyType(value: string | null): 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP' | null {
        if (value === 'CPF' || value === 'CNPJ' || value === 'EMAIL' || value === 'PHONE' || value === 'EVP') {
            return value;
        }
        return null;
    }
}
