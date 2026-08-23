import { RequestWithdrawalUseCase } from '../RequestWithdrawalUseCase';

describe('RequestWithdrawalUseCase', () => {
    const originalMinimumWithdrawal = process.env.MIN_WITHDRAWAL_AMOUNT;
    const userRepository = { findById: jest.fn() };
    const withdrawalRepository = { createWithBalanceReservation: jest.fn() };
    const paymentRepository = { releaseMaturedHostFunds: jest.fn() };
    const useCase = new RequestWithdrawalUseCase(
        userRepository as any,
        withdrawalRepository as any,
        paymentRepository as any
    );

    beforeEach(() => {
        process.env.MIN_WITHDRAWAL_AMOUNT = '50';
        jest.clearAllMocks();
        userRepository.findById.mockResolvedValue({
            id: 'user-1',
            fullName: 'Host',
            avatarUrl: null,
            pixKey: '529.982.247-25',
            pixKeyType: 'CPF',
            kycStatus: 'APPROVED',
            updatedAt: new Date(),
        });
        withdrawalRepository.createWithBalanceReservation.mockResolvedValue({ id: 'withdrawal-1' });
        paymentRepository.releaseMaturedHostFunds.mockResolvedValue(0);
    });

    afterAll(() => {
        if (originalMinimumWithdrawal === undefined) {
            delete process.env.MIN_WITHDRAWAL_AMOUNT;
        } else {
            process.env.MIN_WITHDRAWAL_AMOUNT = originalMinimumWithdrawal;
        }
    });

    it('requires approved KYC before reserving wallet balance', async () => {
        userRepository.findById.mockResolvedValue({
            id: 'user-1',
            pixKey: 'host@example.com',
            pixKeyType: 'EMAIL',
            kycStatus: 'PENDING',
        });

        await expect(useCase.execute('user-1', 90)).rejects.toThrow('verificacao de identidade');
        expect(withdrawalRepository.createWithBalanceReservation).not.toHaveBeenCalled();
    });

    it('rejects fractional cents', async () => {
        await expect(useCase.execute('user-1', 90.001)).rejects.toThrow('duas casas decimais');
        expect(userRepository.findById).not.toHaveBeenCalled();
    });

    it('rejects withdrawals below the configured minimum', async () => {
        await expect(useCase.execute('user-1', 49.99)).rejects.toThrow('valor minimo para saque e R$ 50,00');
        expect(paymentRepository.releaseMaturedHostFunds).not.toHaveBeenCalled();
        expect(withdrawalRepository.createWithBalanceReservation).not.toHaveBeenCalled();
    });

    it('snapshots a normalized Pix key and exact cent amount', async () => {
        await useCase.execute('user-1', 90);

        expect(paymentRepository.releaseMaturedHostFunds).toHaveBeenCalledWith('user-1');
        expect(withdrawalRepository.createWithBalanceReservation).toHaveBeenCalledWith({
            userId: 'user-1',
            amount: 90,
            pixKey: '52998224725',
            pixKeyType: 'CPF',
        });
    });
});
