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

    async createWithBalanceReservation(data: {
        userId: string;
        amount: number;
        pixKey: string;
        pixKeyType?: string | null;
    }): Promise<WithdrawalRequest> {
        return prisma.$transaction(async (tx) => {
            const debited = await tx.user.updateMany({
                where: {
                    id: data.userId,
                    walletBalance: { gte: data.amount },
                },
                data: {
                    walletBalance: { decrement: data.amount },
                },
            });

            if (debited.count === 0) {
                throw new Error('Saldo insuficiente para realizar este saque');
            }

            const withdrawal = await tx.withdrawalRequest.create({
                data: {
                    userId: data.userId,
                    amount: data.amount,
                    pixKey: data.pixKey,
                    pixKeyType: data.pixKeyType,
                    status: 'PENDING',
                },
            });

            await tx.walletTransaction.create({
                data: {
                    userId: data.userId,
                    amount: -data.amount,
                    type: 'DEBIT_WITHDRAWAL',
                    description: 'Reserva de saque',
                    referenceId: withdrawal.id,
                },
            });

            return this.toDomain(withdrawal);
        });
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

    async markSubmitted(data: {
        id: string;
        providerTransferId: string;
        providerEndToEndId?: string | null;
        status: 'PROCESSING' | 'COMPLETED';
    }): Promise<WithdrawalRequest> {
        const withdrawal = await prisma.withdrawalRequest.update({
            where: { id: data.id },
            data: {
                provider: 'ASAAS',
                providerTransferId: data.providerTransferId,
                providerEndToEndId: data.providerEndToEndId,
                status: data.status,
            },
        });

        return this.toDomain(withdrawal);
    }

    async completeByProviderTransferId(
        providerTransferId: string,
        providerEndToEndId?: string
    ): Promise<boolean> {
        const updated = await prisma.withdrawalRequest.updateMany({
            where: {
                providerTransferId,
                status: 'PROCESSING',
            },
            data: {
                status: 'COMPLETED',
                ...(providerEndToEndId && { providerEndToEndId }),
            },
        });

        return updated.count === 1;
    }

    async failAndRefundByProviderTransferId(providerTransferId: string): Promise<boolean> {
        const withdrawal = await prisma.withdrawalRequest.findUnique({
            where: { providerTransferId },
        });
        if (!withdrawal) return false;
        return this.failAndRefund(withdrawal.id);
    }

    async failAndRefund(id: string): Promise<boolean> {
        return prisma.$transaction(async (tx) => {
            const withdrawal = await tx.withdrawalRequest.findUnique({ where: { id } });
            if (!withdrawal || withdrawal.status !== 'PROCESSING') return false;

            const failed = await tx.withdrawalRequest.updateMany({
                where: { id, status: 'PROCESSING' },
                data: { status: 'FAILED' },
            });
            if (failed.count === 0) return false;

            await tx.user.update({
                where: { id: withdrawal.userId },
                data: { walletBalance: { increment: withdrawal.amount } },
            });

            await tx.walletTransaction.create({
                data: {
                    userId: withdrawal.userId,
                    amount: withdrawal.amount,
                    type: 'REFUND_WITHDRAWAL_FAILED',
                    description: 'Estorno de saque nao concluido',
                    referenceId: withdrawal.id,
                },
            });

            return true;
        });
    }

    async claimPending(id: string): Promise<WithdrawalRequest | null> {
        const claimed = await prisma.withdrawalRequest.updateMany({
            where: { id, status: 'PENDING' },
            data: { status: 'PROCESSING' },
        });

        if (claimed.count === 0) {
            return null;
        }

        const withdrawal = await prisma.withdrawalRequest.findUnique({ where: { id } });
        return withdrawal ? this.toDomain(withdrawal) : null;
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
            include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
        });
        return withdrawals.map(w => this.toDomain(w));
    }

    private toDomain(raw: any): WithdrawalRequest {
        return {
            id: raw.id,
            userId: raw.userId,
            userName: raw.user?.fullName ?? null,
            userAvatarUrl: raw.user?.avatarUrl ?? null,
            amount: Number(raw.amount),
            pixKey: raw.pixKey,
            pixKeyType: raw.pixKeyType,
            status: raw.status as any,
            efiEndToEndId: raw.efiEndToEndId,
            provider: raw.provider,
            providerTransferId: raw.providerTransferId,
            providerEndToEndId: raw.providerEndToEndId,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        };
    }
}
