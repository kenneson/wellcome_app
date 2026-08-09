import { PaymentGatewayError } from '../../../domain/services/PaymentGateway';
import { ApproveWithdrawalUseCase } from '../ApproveWithdrawalUseCase';

describe('ApproveWithdrawalUseCase', () => {
    const withdrawal = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'host-1',
        amount: 90,
        pixKey: 'host@example.com',
        pixKeyType: 'EMAIL',
        status: 'PENDING',
        provider: 'ASAAS',
        submissionAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    const repository = {
        findById: jest.fn(),
        claimPending: jest.fn(),
        failAndRefund: jest.fn(),
        markSubmitted: jest.fn(),
        markSubmissionUncertain: jest.fn(),
    };
    const payoutGateway = { createPixTransfer: jest.fn() };
    const userRepository = { findById: jest.fn() };
    const useCase = new ApproveWithdrawalUseCase(
        repository as any,
        payoutGateway as any,
        userRepository as any
    );

    beforeEach(() => {
        jest.clearAllMocks();
        repository.findById.mockResolvedValue(withdrawal);
        repository.claimPending.mockResolvedValue({ ...withdrawal, status: 'PROCESSING' });
        repository.failAndRefund.mockResolvedValue(true);
        repository.markSubmitted.mockImplementation(async (data) => ({
            ...withdrawal,
            status: data.status,
            providerTransferId: data.providerTransferId,
        }));
        repository.markSubmissionUncertain.mockResolvedValue({
            ...withdrawal,
            status: 'PROCESSING',
            providerStatus: 'SUBMISSION_UNCERTAIN',
        });
        userRepository.findById.mockResolvedValue({ id: 'host-1', kycStatus: 'APPROVED' });
        payoutGateway.createPixTransfer.mockResolvedValue({
            id: 'transfer-1',
            status: 'PENDING',
            externalReference: withdrawal.id,
        });
    });

    it('claims the request once and uses its id as externalReference', async () => {
        const result = await useCase.execute(withdrawal.id, 'admin-1');

        expect(repository.claimPending).toHaveBeenCalledWith(withdrawal.id, 'admin-1');
        expect(payoutGateway.createPixTransfer).toHaveBeenCalledWith(expect.objectContaining({
            value: 90,
            pixAddressKey: 'host@example.com',
            externalReference: withdrawal.id,
        }));
        expect(result.status).toBe('PROCESSING');
    });

    it('does not call Asaas when another request already claimed the withdrawal', async () => {
        repository.claimPending.mockResolvedValue(null);

        await expect(useCase.execute(withdrawal.id, 'admin-1')).rejects.toThrow('mudou de estado');
        expect(payoutGateway.createPixTransfer).not.toHaveBeenCalled();
    });

    it('refunds the reservation after a definitive provider rejection', async () => {
        payoutGateway.createPixTransfer.mockRejectedValue(
            new PaymentGatewayError('Saldo insuficiente', 400, 'invalid_balance')
        );

        await expect(useCase.execute(withdrawal.id, 'admin-1')).rejects.toThrow('rejeitada pelo Asaas');
        expect(repository.failAndRefund).toHaveBeenCalledWith(withdrawal.id, 'Saldo insuficiente');
    });

    it('keeps the reservation locked when the provider outcome is uncertain', async () => {
        payoutGateway.createPixTransfer.mockRejectedValue(
            new PaymentGatewayError('Timeout', undefined, undefined, true)
        );

        const result = await useCase.execute(withdrawal.id, 'admin-1');

        expect(repository.failAndRefund).not.toHaveBeenCalled();
        expect(repository.markSubmissionUncertain).toHaveBeenCalledWith(withdrawal.id, 'Timeout');
        expect(result.status).toBe('PROCESSING');
    });
});
