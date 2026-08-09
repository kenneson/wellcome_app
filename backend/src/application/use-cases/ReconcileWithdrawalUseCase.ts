import { WithdrawalRequest, WithdrawalRequestRepository } from '../../domain/repositories/WithdrawalRequestRepository';
import { PayoutGateway } from '../../domain/services/PaymentGateway';

export class ReconcileWithdrawalUseCase {
    constructor(
        private withdrawalRequestRepository: WithdrawalRequestRepository,
        private payoutGateway: PayoutGateway
    ) {}

    async execute(withdrawalId: string): Promise<WithdrawalRequest> {
        const withdrawal = await this.withdrawalRequestRepository.findById(withdrawalId);
        if (!withdrawal) throw new Error('Pedido de saque nao encontrado');
        if (withdrawal.status !== 'PROCESSING') return withdrawal;

        const transfer = withdrawal.providerTransferId
            ? await this.payoutGateway.getPixTransfer(withdrawal.providerTransferId)
            : await this.payoutGateway.findPixTransferByExternalReference(
                withdrawal.id,
                withdrawal.approvedAt || withdrawal.updatedAt
            );

        if (!transfer) {
            throw new Error('Transferencia ainda nao localizada no Asaas; nao reenvie o Pix');
        }

        if (transfer.status === 'DONE') {
            await this.withdrawalRequestRepository.completeByProviderTransferId(
                transfer.id,
                transfer.endToEndIdentifier || undefined,
                withdrawal.id
            );
        } else if (transfer.status === 'FAILED' || transfer.status === 'CANCELLED') {
            await this.withdrawalRequestRepository.failAndRefundByProviderTransferId(
                transfer.id,
                withdrawal.id,
                transfer.failReason || `Transferencia ${transfer.status.toLowerCase()} no Asaas`
            );
        } else {
            await this.withdrawalRequestRepository.recordProviderProcessing({
                providerTransferId: transfer.id,
                externalReference: withdrawal.id,
                providerStatus: transfer.status,
                providerEndToEndId: transfer.endToEndIdentifier,
            });
        }

        const reconciled = await this.withdrawalRequestRepository.findById(withdrawal.id);
        if (!reconciled) throw new Error('Saque desapareceu durante a conciliacao');
        return reconciled;
    }
}
