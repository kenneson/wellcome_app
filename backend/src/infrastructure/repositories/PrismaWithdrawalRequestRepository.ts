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
                provider: 'ASAAS',
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
            await tx.$queryRaw`select pg_advisory_xact_lock(hashtextextended(${data.userId}, 0))`;

            const activeWithdrawal = await tx.withdrawalRequest.count({
                where: {
                    userId: data.userId,
                    status: { in: ['PENDING', 'PROCESSING'] },
                },
            });
            if (activeWithdrawal > 0) {
                throw new Error('Ja existe um saque pendente ou em processamento');
            }

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
                    provider: 'ASAAS',
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
        const withdrawal = await prisma.withdrawalRequest.findUnique({ where: { id } });
        return withdrawal ? this.toDomain(withdrawal) : null;
    }

    async updateStatus(
        id: string,
        status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
        efiEndToEndId?: string
    ): Promise<WithdrawalRequest> {
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
        providerStatus?: string;
        status: 'PROCESSING' | 'COMPLETED';
    }): Promise<WithdrawalRequest> {
        const now = new Date();
        await prisma.withdrawalRequest.updateMany({
            where: {
                id: data.id,
                status: 'PROCESSING',
                OR: [
                    { providerTransferId: null },
                    { providerTransferId: data.providerTransferId },
                ],
            },
            data: {
                provider: 'ASAAS',
                providerTransferId: data.providerTransferId,
                providerEndToEndId: data.providerEndToEndId,
                providerStatus: data.providerStatus || (data.status === 'COMPLETED' ? 'DONE' : 'PENDING'),
                status: data.status,
                submittedAt: now,
                ...(data.status === 'COMPLETED' && { completedAt: now }),
                failureReason: null,
            },
        });

        const withdrawal = await prisma.withdrawalRequest.findUnique({ where: { id: data.id } });
        if (!withdrawal || withdrawal.providerTransferId !== data.providerTransferId) {
            throw new Error('Falha ao vincular a transferencia Asaas ao saque');
        }
        return this.toDomain(withdrawal);
    }

    async markSubmissionUncertain(id: string, reason: string): Promise<WithdrawalRequest> {
        const withdrawal = await prisma.withdrawalRequest.update({
            where: { id },
            data: {
                provider: 'ASAAS',
                providerStatus: 'SUBMISSION_UNCERTAIN',
                failureReason: reason.substring(0, 1000),
            },
        });
        return this.toDomain(withdrawal);
    }

    async recordProviderProcessing(data: {
        providerTransferId: string;
        externalReference?: string | null;
        providerStatus: string;
        providerEndToEndId?: string | null;
    }): Promise<boolean> {
        const updated = await prisma.withdrawalRequest.updateMany({
            where: {
                status: 'PROCESSING',
                OR: this.providerReferenceFilter(data.providerTransferId, data.externalReference),
            },
            data: {
                provider: 'ASAAS',
                providerTransferId: data.providerTransferId,
                providerEndToEndId: data.providerEndToEndId,
                providerStatus: data.providerStatus,
                submittedAt: new Date(),
                failureReason: null,
            },
        });
        return updated.count === 1;
    }

    async completeByProviderTransferId(
        providerTransferId: string,
        providerEndToEndId?: string,
        externalReference?: string | null
    ): Promise<boolean> {
        const now = new Date();
        const updated = await prisma.withdrawalRequest.updateMany({
            where: {
                status: 'PROCESSING',
                OR: this.providerReferenceFilter(providerTransferId, externalReference),
            },
            data: {
                provider: 'ASAAS',
                providerTransferId,
                providerEndToEndId,
                providerStatus: 'DONE',
                status: 'COMPLETED',
                completedAt: now,
                lastReconciledAt: now,
                failureReason: null,
            },
        });
        return updated.count === 1;
    }

    async failAndRefundByProviderTransferId(
        providerTransferId: string,
        externalReference?: string | null,
        reason?: string
    ): Promise<boolean> {
        const withdrawal = await prisma.withdrawalRequest.findFirst({
            where: {
                OR: this.providerReferenceFilter(providerTransferId, externalReference),
            },
        });
        if (!withdrawal) return false;
        return this.failAndRefundInternal(
            withdrawal.id,
            reason || 'Transferencia recusada ou cancelada pelo Asaas',
            providerTransferId
        );
    }

    async failAndRefund(id: string, reason = 'Transferencia nao concluida'): Promise<boolean> {
        return this.failAndRefundInternal(id, reason, undefined);
    }

    private async failAndRefundInternal(
        id: string,
        reason: string,
        providerTransferId?: string
    ): Promise<boolean> {
        return prisma.$transaction(async (tx) => {
            const withdrawal = await tx.withdrawalRequest.findUnique({ where: { id } });
            if (!withdrawal || withdrawal.status !== 'PROCESSING') return false;

            const failed = await tx.withdrawalRequest.updateMany({
                where: { id, status: 'PROCESSING' },
                data: {
                    status: 'FAILED',
                    provider: 'ASAAS',
                    ...(providerTransferId && { providerTransferId }),
                    providerStatus: 'FAILED',
                    failureReason: reason.substring(0, 1000),
                    failedAt: new Date(),
                    lastReconciledAt: new Date(),
                },
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

    async claimPending(id: string, approvedByAdminId: string): Promise<WithdrawalRequest | null> {
        const claimed = await prisma.withdrawalRequest.updateMany({
            where: {
                id,
                status: 'PENDING',
                user: { kycStatus: 'APPROVED' },
            },
            data: {
                status: 'PROCESSING',
                provider: 'ASAAS',
                providerStatus: 'SUBMITTING',
                approvedByAdminId,
                approvedAt: new Date(),
                submissionAttempts: { increment: 1 },
                failureReason: null,
            },
        });
        if (claimed.count === 0) return null;

        const withdrawal = await prisma.withdrawalRequest.findUnique({ where: { id } });
        return withdrawal ? this.toDomain(withdrawal) : null;
    }

    async findByUserId(userId: string): Promise<WithdrawalRequest[]> {
        const withdrawals = await prisma.withdrawalRequest.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        return withdrawals.map((withdrawal) => this.toDomain(withdrawal));
    }

    async findAll(): Promise<WithdrawalRequest[]> {
        const withdrawals = await prisma.withdrawalRequest.findMany({
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
        });
        return withdrawals.map((withdrawal) => this.toDomain(withdrawal));
    }

    private providerReferenceFilter(providerTransferId: string, externalReference?: string | null) {
        return [
            { providerTransferId },
            ...(externalReference && this.isUuid(externalReference) ? [{ id: externalReference }] : []),
        ];
    }

    private isUuid(value: string): boolean {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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
            status: raw.status,
            efiEndToEndId: raw.efiEndToEndId,
            provider: raw.provider,
            providerTransferId: raw.providerTransferId,
            providerEndToEndId: raw.providerEndToEndId,
            providerStatus: raw.providerStatus,
            approvedByAdminId: raw.approvedByAdminId,
            submissionAttempts: raw.submissionAttempts,
            failureReason: raw.failureReason,
            approvedAt: raw.approvedAt,
            submittedAt: raw.submittedAt,
            completedAt: raw.completedAt,
            failedAt: raw.failedAt,
            lastReconciledAt: raw.lastReconciledAt,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        };
    }
}
