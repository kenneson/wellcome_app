import { UserRepository } from '../../domain/repositories/UserRepository';
import { User } from '../../domain/entities/User';
import { normalizePixKey } from '../../domain/services/PixKeyValidation';

export class UpdateUserProfileUseCase {
    constructor(private userRepository: UserRepository) { }

    async execute(id: string, data: Partial<User>): Promise<User> {
        const hasPixKeyUpdate = data.pixKey !== undefined || data.pixKeyType !== undefined;
        if (!hasPixKeyUpdate) return this.userRepository.update(id, data);

        if (!data.pixKey || !data.pixKeyType) {
            throw new Error('Informe a chave Pix e o tipo da chave');
        }

        const pix = normalizePixKey(data.pixKey, data.pixKeyType);
        return this.userRepository.update(id, {
            ...data,
            pixKey: pix.key,
            pixKeyType: pix.type,
        });
    }
}
