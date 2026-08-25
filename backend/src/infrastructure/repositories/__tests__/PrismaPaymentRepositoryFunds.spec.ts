import { PaymentStatus } from '../../../domain/value-objects/PaymentStatus';
import { prisma } from '../../database/prismaClient';
import { PrismaPaymentRepository } from '../PrismaPaymentRepository';

jest.mock('../../database/prismaClient', () => ({
    prisma: {
        $transaction: jest.fn(),
        payment: { findMany: jest.fn() },
    },
}));

describe('PrismaPaymentRepository host fund lifecycle', () => {
    const tx = {
        $queryRaw: jest.fn(),
        payment: {
            findUnique: jest.fn(),
            update: jest.fn(),
            updateMany: jest.fn(),
        },
        booking: {
            findUnique: jest.fn(),
            update: jest.fn(),
            updateMany: jest.fn(),
        },
        walletTransaction: {
            findFirst: jest.fn(),
            create: jest.fn(),
        },
        user: {
            update: jest.fn(),
            updateMany: jest.fn(),
        },
    };
    const repository = new PrismaPaymentRepository();

    beforeEach(() => {
        jest.clearAllMocks();
        (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => callback(tx));
        tx.$queryRaw.mockResolvedValue([]);
        tx.walletTransaction.findFirst.mockResolvedValue(null);
        tx.user.updateMany.mockResolvedValue({ count: 1 });
    });

    it('moves approved payment value into pending balance without creating withdrawable credit', async () => {
        const availableAt = new Date('2026-08-25T22:00:00.000Z');
        tx.payment.findUnique.mockResolvedValue({
            id: 'payment-1',
            status: PaymentStatus.CONFIRMED,
            netAmount: 90,
            refundedNetAmount: 0,
            fundsHeldAt: null,
            booking: { event: { hostId: 'host-1' } },
        });

        await expect(repository.holdHostFunds({
            paymentId: 'payment-1',
            hostId: 'host-1',
            fundsAvailableAt: availableAt,
        })).resolves.toBe(true);

        expect(tx.user.update).toHaveBeenCalledWith({
            where: { id: 'host-1' },
            data: { pendingWalletBalance: { increment: 90 } },
        });
        expect(tx.payment.update).toHaveBeenCalledWith({
            where: { id: 'payment-1' },
            data: { fundsHeldAt: expect.any(Date), fundsAvailableAt: availableAt },
        });
        expect(tx.walletTransaction.create).not.toHaveBeenCalled();
    });

    it('atomically converts matured pending value into withdrawable balance once', async () => {
        const now = new Date('2026-08-26T00:00:00.000Z');
        (prisma.payment.findMany as jest.Mock).mockResolvedValue([{ id: 'payment-1' }]);
        tx.payment.findUnique.mockResolvedValue({
            status: PaymentStatus.CONFIRMED,
            provider: 'ASAAS',
            providerStatus: 'RECEIVED',
            netAmount: 90,
            refundedNetAmount: 0,
            fundsHeldAt: new Date('2026-08-24T18:00:00.000Z'),
            fundsAvailableAt: new Date('2026-08-25T22:00:00.000Z'),
            fundsReleasedAt: null,
            booking: { status: 'APPROVED', event: { hostId: 'host-1' } },
        });

        await expect(repository.releaseMaturedHostFunds('host-1', now)).resolves.toBe(90);

        expect(tx.user.updateMany).toHaveBeenCalledWith({
            where: { id: 'host-1', pendingWalletBalance: { gte: 90 } },
            data: {
                pendingWalletBalance: { decrement: 90 },
                walletBalance: { increment: 90 },
            },
        });
        expect(tx.walletTransaction.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                userId: 'host-1',
                amount: 90,
                type: 'CREDIT_EVENT_TICKET',
                referenceId: 'payment-1',
            }),
        });
        expect(tx.payment.update).toHaveBeenCalledWith({
            where: { id: 'payment-1' },
            data: { fundsReleasedAt: now },
        });
        expect(prisma.payment.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                OR: [
                    { provider: { not: 'ASAAS' } },
                    { providerStatus: { in: ['RECEIVED', 'RECEIVED_IN_CASH'] } },
                ],
            }),
        }));
    });

    it('does not release card receivables before Asaas marks them as received', async () => {
        const now = new Date('2026-08-26T00:00:00.000Z');
        (prisma.payment.findMany as jest.Mock).mockResolvedValue([{ id: 'payment-1' }]);
        tx.payment.findUnique.mockResolvedValue({
            status: PaymentStatus.CONFIRMED,
            provider: 'ASAAS',
            providerStatus: 'CONFIRMED',
            netAmount: 90,
            refundedNetAmount: 0,
            fundsHeldAt: new Date('2026-08-24T18:00:00.000Z'),
            fundsAvailableAt: new Date('2026-08-25T22:00:00.000Z'),
            fundsReleasedAt: null,
            booking: { status: 'APPROVED', event: { hostId: 'host-1' } },
        });

        await expect(repository.releaseMaturedHostFunds('host-1', now)).resolves.toBe(0);
        expect(tx.user.updateMany).not.toHaveBeenCalled();
        expect(tx.walletTransaction.create).not.toHaveBeenCalled();
    });

    it('deducts a refund from pending balance before funds are released', async () => {
        tx.payment.findUnique.mockResolvedValue({
            id: 'payment-1',
            bookingId: 'booking-1',
            valor: 100,
            status: PaymentStatus.CONFIRMED,
            netAmount: 90,
            refundedAmount: 0,
            refundedNetAmount: 0,
            fundsHeldAt: new Date('2026-08-24T18:00:00.000Z'),
            fundsReleasedAt: null,
        });

        await expect(repository.applyRefund({
            paymentId: 'payment-1',
            hostId: 'host-1',
            refundedAmount: 50,
            targetStatus: 'PARTIALLY_REFUNDED',
            providerStatus: 'PARTIALLY_REFUNDED',
            referenceId: 'refund-1',
        })).resolves.toBe(true);

        expect(tx.user.updateMany).toHaveBeenCalledWith({
            where: { id: 'host-1', pendingWalletBalance: { gte: 45 } },
            data: { pendingWalletBalance: { decrement: 45 } },
        });
        expect(tx.walletTransaction.create).not.toHaveBeenCalled();
        expect(tx.user.update).not.toHaveBeenCalled();
    });
});
