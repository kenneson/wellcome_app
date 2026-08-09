import { ReconcileWithdrawalUseCase } from '../ReconcileWithdrawalUseCase';

describe('ReconcileWithdrawalUseCase', () => {
    const withdrawal = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'host-1',
        amount: 90,
        pixKey: 'host@example.com',
        pixKeyType: 'EMAIL',
        status: 'PROCESSING',
        provider: 'ASAAS',
        providerTransferId: null,
        submissionAttempts: 1,
        createdAt: new Date('2026-08-09T12:00:00Z'),
        approvedAt: new Date('2026-08-11T12:00:00Z'),
        updatedAt: new Date('2026-08-11T12:00:00Z'),
    };
    const repository = {
        findById: jest.fn(),
        completeByProviderTransferId: jest.fn(),
        failAndRefundByProviderTransferId: jest.fn(),
        recordProviderProcessing: jest.fn(),
    };
    const payoutGateway = {
        getPixTransfer: jest.fn(),
        findPixTransferByExternalReference: jest.fn(),
    };
    const useCase = new ReconcileWithdrawalUseCase(repository as any, payoutGateway as any);

    beforeEach(() => {
        jest.clearAllMocks();
        repository.findById
            .mockResolvedValueOnce(withdrawal)
            .mockResolvedValueOnce({ ...withdrawal, status: 'COMPLETED', providerTransferId: 'transfer-1' });
        payoutGateway.findPixTransferByExternalReference.mockResolvedValue({
            id: 'transfer-1',
            status: 'DONE',
            externalReference: withdrawal.id,
            endToEndIdentifier: 'e2e-1',
        });
    });

    it('finds an uncertain submission by externalReference without creating another Pix', async () => {
        const result = await useCase.execute(withdrawal.id);

        expect(payoutGateway.findPixTransferByExternalReference).toHaveBeenCalledWith(
            withdrawal.id,
            withdrawal.approvedAt
        );
        expect(repository.completeByProviderTransferId).toHaveBeenCalledWith(
            'transfer-1',
            'e2e-1',
            withdrawal.id
        );
        expect(result.status).toBe('COMPLETED');
    });

    it('does not refund or resubmit when the transfer is not found yet', async () => {
        repository.findById.mockReset().mockResolvedValue(withdrawal);
        payoutGateway.findPixTransferByExternalReference.mockResolvedValue(null);

        await expect(useCase.execute(withdrawal.id)).rejects.toThrow('nao localizada');
        expect(repository.failAndRefundByProviderTransferId).not.toHaveBeenCalled();
    });
});
