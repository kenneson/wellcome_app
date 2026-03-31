import { User } from '../entities/User';

export interface UserRepository {
    findById(id: string): Promise<User | null>;
    update(id: string, data: Partial<User>): Promise<User>;
    addWalletBalance(userId: string, amount: number, referenceId?: string): Promise<void>;
}
