import { UserRepository } from '../../domain/repositories/UserRepository';
import { User } from '../../domain/entities/User';

export class UpdateUserProfileUseCase {
    constructor(private userRepository: UserRepository) { }

    async execute(id: string, data: Partial<User>): Promise<User> {
        return this.userRepository.update(id, data);
    }
}
