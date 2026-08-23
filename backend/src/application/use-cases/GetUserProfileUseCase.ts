import { UserRepository } from '../../domain/repositories/UserRepository';
import { User } from '../../domain/entities/User';
import { PaymentRepository } from '../../domain/repositories/PaymentRepository';

export class GetUserProfileUseCase {
    constructor(
        private userRepository: UserRepository,
        private paymentRepository: PaymentRepository
    ) { }

    async execute(userId: string, releaseMaturedFunds = false): Promise<User | null> {
        if (releaseMaturedFunds) {
            await this.paymentRepository.releaseMaturedHostFunds(userId);
        }
        return this.userRepository.findById(userId);
    }
}
