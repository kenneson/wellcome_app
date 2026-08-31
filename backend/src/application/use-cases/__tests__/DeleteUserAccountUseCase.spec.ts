import { UserRepository } from '../../../domain/repositories/UserRepository';
import { AccountDeletionGateway } from '../../../domain/services/AccountDeletionGateway';
import { DeleteUserAccountBlockedError, DeleteUserAccountUseCase } from '../DeleteUserAccountUseCase';

describe('DeleteUserAccountUseCase', () => {
    const userId = '11111111-1111-4111-8111-111111111111';
    let repository: jest.Mocked<UserRepository>;
    let gateway: jest.Mocked<AccountDeletionGateway>;

    beforeEach(() => {
        repository = {
            findById: jest.fn().mockResolvedValue({
                id: userId,
                fullName: 'User',
                avatarUrl: null,
                updatedAt: new Date(),
            }),
            update: jest.fn(),
            addWalletBalance: jest.fn(),
            getAccountDeletionBlockers: jest.fn().mockResolvedValue([]),
            deleteAccount: jest.fn().mockResolvedValue(undefined),
        };
        gateway = {
            deleteOwnedStorageObjects: jest.fn().mockResolvedValue(undefined),
            deleteAuthUser: jest.fn().mockResolvedValue(undefined),
        };
    });

    it('removes storage, anonymizes application data and then deletes the Auth user', async () => {
        const calls: string[] = [];
        gateway.deleteOwnedStorageObjects.mockImplementation(async () => { calls.push('storage'); });
        repository.deleteAccount.mockImplementation(async () => { calls.push('profile'); });
        gateway.deleteAuthUser.mockImplementation(async () => { calls.push('auth'); });

        await new DeleteUserAccountUseCase(repository, gateway).execute(userId);

        expect(calls).toEqual(['storage', 'profile', 'auth']);
    });

    it('does not delete anything when the account has blockers', async () => {
        repository.getAccountDeletionBlockers.mockResolvedValue(['Pending wallet balance']);

        await expect(new DeleteUserAccountUseCase(repository, gateway).execute(userId))
            .rejects.toBeInstanceOf(DeleteUserAccountBlockedError);
        expect(gateway.deleteOwnedStorageObjects).not.toHaveBeenCalled();
        expect(repository.deleteAccount).not.toHaveBeenCalled();
        expect(gateway.deleteAuthUser).not.toHaveBeenCalled();
    });

    it('does not anonymize the profile when storage cleanup fails', async () => {
        gateway.deleteOwnedStorageObjects.mockRejectedValue(new Error('Storage unavailable'));

        await expect(new DeleteUserAccountUseCase(repository, gateway).execute(userId))
            .rejects.toThrow('Storage unavailable');
        expect(repository.deleteAccount).not.toHaveBeenCalled();
        expect(gateway.deleteAuthUser).not.toHaveBeenCalled();
    });
});
