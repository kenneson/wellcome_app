import { UserRepository } from '../../domain/repositories/UserRepository';
import { AccountDeletionGateway } from '../../domain/services/AccountDeletionGateway';

export class DeleteUserAccountBlockedError extends Error {
    constructor(public readonly blockers: string[]) {
        super(blockers[0] || 'Account deletion is blocked');
        this.name = 'DeleteUserAccountBlockedError';
    }
}

export class DeleteUserAccountUseCase {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly accountDeletionGateway: AccountDeletionGateway
    ) { }

    async execute(userId: string): Promise<void> {
        const user = await this.userRepository.findById(userId);

        if (!user) {
            throw new Error('User not found');
        }

        const blockers = await this.userRepository.getAccountDeletionBlockers(userId);

        if (blockers.length > 0) {
            throw new DeleteUserAccountBlockedError(blockers);
        }

        await this.accountDeletionGateway.deleteOwnedStorageObjects(userId);
        await this.userRepository.deleteAccount(userId);
        await this.accountDeletionGateway.deleteAuthUser(userId);
    }
}
