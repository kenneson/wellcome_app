import { WithdrawalRequest, WithdrawalRequestRepository } from '../../domain/repositories/WithdrawalRequestRepository';
import { prisma } from '../database/prismaClient';

export class PrismaWithdrawalRequestRepository implements WithdrawalRequestRepository {
    async create(data: {
        userId: string;
        amount: number;
        pixKey: string;
        pixKeyType?: string | null;
    }): Promise<WithdrawalRequest> {
        const withdrawal = await prisma.withdrawalRequest.create({
            data: {
                userId: data.userId,
                amount: data.amount,
                pixKey: data.pixKey,
                pixKeyType: data.pixKeyType,
                status: 'PENDING',
            },
        });
        return this.toDomain(withdrawal);
    }

    async findById(id: string): Promise<WithdrawalRequest | null> {
        const withdrawal = await prisma.withdrawalRequest.findUnique({
            where: { id },
        });
        return withdrawal ? this.toDomain(withdrawal) : null;
    }

    async updateStatus(id: string, status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED', efiEndToEndId?: string): Promise<WithdrawalRequest> {
        const withdrawal = await prisma.withdrawalRequest.update({
            where: { id },
            data: {
                status,
                ...(efiEndToEndId && { efiEndToEndId }),
            },
        });
        return this.toDomain(withdrawal);
    }

    async findByUserId(userId: string): Promise<WithdrawalRequest[]> {
        const withdrawals = await prisma.withdrawalRequest.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        return withdrawals.map(w => this.toDomain(w));
    }

    async findAll(): Promise<WithdrawalRequest[]> {
        const withdrawals = await prisma.withdrawalRequest.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return withdrawals.map(w => this.toDomain(w));
    }

    private toDomain(raw: any): WithdrawalRequest {
        return {
            id: raw.id,
            userId: raw.userId,
            amount: Number(raw.amount),
            pixKey: raw.pixKey,
            pixKeyType: raw.pixKeyType,
            status: raw.status as any,
            efiEndToEndId: raw.efiEndToEndId,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        };
    }
}
