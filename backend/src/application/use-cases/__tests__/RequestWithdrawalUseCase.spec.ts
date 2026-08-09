import { RequestWithdrawalUseCase } from '../RequestWithdrawalUseCase';

describe('RequestWithdrawalUseCase', () => {
    const userRepository = { findById: jest.fn() };
    const withdrawalRepository = { createWithBalanceReservation: jest.fn() };
    const useCase = new RequestWithdrawalUseCase(userRepository as any, withdrawalRepository as any);

    beforeEach(() => {
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

    it('snapshots a normalized Pix key and exact cent amount', async () => {
        await useCase.execute('user-1', 90);

        expect(withdrawalRepository.createWithBalanceReservation).toHaveBeenCalledWith({
            userId: 'user-1',
            amount: 90,
            pixKey: '52998224725',
            pixKeyType: 'CPF',
        });
    });
});
