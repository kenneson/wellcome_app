import { UserRepository } from '../../domain/repositories/UserRepository';
import { User } from '../../domain/entities/User';

export class GetUserProfileUseCase {
    constructor(private userRepository: UserRepository) { }

    async execute(userId: string): Promise<User | null> {
        return this.userRepository.findById(userId);
    }
}
