import { Payment } from '../../domain/entities/Payment';
import { PaymentRepository } from '../../domain/repositories/PaymentRepository';
import { PaymentStatus } from '../../domain/value-objects/PaymentStatus';
import { prisma } from '../database/prismaClient';

export class PrismaPaymentRepository implements PaymentRepository {
    async create(data: {
        bookingId: string;
        eventId: string;
        userId: string;
        txid: string;
        pixCopiaECola: string;
        qrcode: string;
        valor: number;
        provider?: string;
        providerStatus?: string;
    }): Promise<Payment> {
        const payment = await prisma.payment.create({
            data: {
                bookingId: data.bookingId,
                eventId: data.eventId,
                userId: data.userId,
                txid: data.txid,
                pixCopiaECola: data.pixCopiaECola,
                qrcode: data.qrcode,
                valor: data.valor,
                status: 'PENDING',
                provider: data.provider ?? 'EFI',
                providerStatus: data.providerStatus,
            },
        });

        return this.toDomain(payment);
    }

    async findByBookingId(bookingId: string): Promise<Payment | null> {
        const payment = await prisma.payment.findUnique({
            where: { bookingId },
        });

        return payment ? this.toDomain(payment) : null;
    }

    async findByTxid(txid: string): Promise<Payment | null> {
        const payment = await prisma.payment.findUnique({
            where: { txid },
        });

        return payment ? this.toDomain(payment) : null;
    }

    async findByProviderPaymentId(providerPaymentId: string): Promise<Payment | null> {
        const payment = await prisma.payment.findUnique({
            where: { providerPaymentId },
        });

        return payment ? this.toDomain(payment) : null;
    }

    async claimCheckoutCreation(id: string): Promise<boolean> {
        const claimed = await prisma.payment.updateMany({
            where: {
                id,
                OR: [
                    { status: PaymentStatus.EXPIRED },
                    {
                        status: PaymentStatus.PENDING,
                        checkoutUrl: null,
                        OR: [
                            { providerStatus: null },
                            { providerStatus: { in: ['NEW', 'FAILED'] } },
                        ],
                    },
                ],
            },
            data: {
                status: PaymentStatus.PENDING,
                provider: 'ASAAS',
                providerStatus: 'CREATING',
                checkoutUrl: null,
                providerPaymentId: null,
                paymentMethod: null,
                pixCopiaECola: '',
                qrcode: '',
            },
        });

        return claimed.count === 1;
    }

    async saveCheckout(data: {
        paymentId: string;
        checkoutId: string;
        checkoutUrl: string;
        providerStatus: string;
    }): Promise<Payment> {
        const payment = await prisma.payment.update({
            where: { id: data.paymentId },
            data: {
                txid: data.checkoutId,
                checkoutUrl: data.checkoutUrl,
                providerStatus: data.providerStatus,
            },
        });

        return this.toDomain(payment);
    }

    async markCheckoutCreationFailed(id: string): Promise<void> {
        await prisma.payment.updateMany({
            where: { id, providerStatus: 'CREATING' },
            data: { providerStatus: 'FAILED' },
        });
    }

    async updateProviderPayment(data: {
        paymentId: string;
        providerPaymentId: string;
        paymentMethod: string;
        providerStatus: string;
    }): Promise<Payment> {
        const payment = await prisma.payment.update({
            where: { id: data.paymentId },
            data: {
                providerPaymentId: data.providerPaymentId,
                paymentMethod: data.paymentMethod,
                providerStatus: data.providerStatus,
            },
        });

        return this.toDomain(payment);
    }

    async expirePendingByTxid(txid: string, providerStatus: string): Promise<boolean> {
        const updated = await prisma.payment.updateMany({
            where: { txid, status: PaymentStatus.PENDING },
            data: {
                status: PaymentStatus.EXPIRED,
                providerStatus,
            },
        });

        return updated.count === 1;
    }

    async updateStatus(id: string, status: string, paidAt?: Date, platformFee?: number, netAmount?: number): Promise<Payment> {
        const payment = await prisma.payment.update({
            where: { id },
            data: {
                status: status as any,
                ...(paidAt && { paidAt }),
                ...(platformFee !== undefined && { platformFee }),
                ...(netAmount !== undefined && { netAmount }),
            },
        });

        return this.toDomain(payment);
    }

    async confirmAndCreditHost(data: {
        paymentId: string;
        bookingId: string;
        hostId: string;
        platformFee: number;
        processorFee?: number;
        netAmount: number;
        paidAt: Date;
        providerStatus?: string;
    }): Promise<boolean> {
        return prisma.$transaction(async (tx) => {
            // Only the request that moves PENDING -> CONFIRMED may create a credit.
            const updated = await tx.payment.updateMany({
                where: {
                    id: data.paymentId,
                    status: PaymentStatus.PENDING,
                },
                data: {
                    status: PaymentStatus.CONFIRMED,
                    paidAt: data.paidAt,
                    platformFee: data.platformFee,
                    processorFee: data.processorFee ?? 0,
                    netAmount: data.netAmount,
                    ...(data.providerStatus && { providerStatus: data.providerStatus }),
                },
            });

            if (updated.count === 0) {
                return false;
            }

            await tx.walletTransaction.create({
                data: {
                    userId: data.hostId,
                    amount: data.netAmount,
                    type: 'CREDIT_EVENT_TICKET',
                    description: 'Pagamento de inscricao',
                    referenceId: data.paymentId,
                },
            });

            await tx.user.update({
                where: { id: data.hostId },
                data: {
                    walletBalance: { increment: data.netAmount },
                },
            });

            await tx.booking.update({
                where: { id: data.bookingId },
                data: { status: 'APPROVED' },
            });

            return true;
        });
    }

    async applyRefund(data: {
        paymentId: string;
        hostId: string;
        refundedAmount: number;
        targetStatus: 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'CHARGEBACK';
        providerStatus: string;
        referenceId: string;
    }): Promise<boolean> {
        return prisma.$transaction(async (tx) => {
            const payment = await tx.payment.findUnique({
                where: { id: data.paymentId },
            });

            if (!payment || !payment.netAmount || Number(payment.valor) <= 0) {
                return false;
            }

            const grossValue = Number(payment.valor);
            const previousRefundedAmount = Number(payment.refundedAmount);
            const nextRefundedAmount = Math.min(grossValue, Math.max(0, data.refundedAmount));
            const isFullRefund = nextRefundedAmount >= grossValue;
            const nextStatus = isFullRefund ? data.targetStatus : PaymentStatus.PARTIALLY_REFUNDED;

            if (nextRefundedAmount <= previousRefundedAmount) {
                if (payment.status !== nextStatus) {
                    await tx.payment.update({
                        where: { id: payment.id },
                        data: { status: nextStatus, providerStatus: data.providerStatus },
                    });
                }
                return false;
            }

            const creditedNetAmount = Number(payment.netAmount);
            const nextRefundedNetAmount = Number(
                ((creditedNetAmount * nextRefundedAmount) / grossValue).toFixed(2)
            );
            const refundedNetDelta = Number(
                (nextRefundedNetAmount - Number(payment.refundedNetAmount)).toFixed(2)
            );

            await tx.payment.update({
                where: { id: payment.id },
                data: {
                    status: nextStatus,
                    providerStatus: data.providerStatus,
                    refundedAmount: nextRefundedAmount,
                    refundedNetAmount: nextRefundedNetAmount,
                },
            });

            if (refundedNetDelta > 0) {
                await tx.walletTransaction.create({
                    data: {
                        userId: data.hostId,
                        amount: -refundedNetDelta,
                        type: 'DEBIT_PAYMENT_REVERSAL',
                        description: isFullRefund ? 'Estorno de pagamento' : 'Estorno parcial de pagamento',
                        referenceId: data.referenceId,
                    },
                });

                await tx.user.update({
                    where: { id: data.hostId },
                    data: {
                        walletBalance: { decrement: refundedNetDelta },
                    },
                });
            }

            if (isFullRefund) {
                await tx.booking.update({
                    where: { id: payment.bookingId },
                    data: { status: 'CANCELLED' },
                });
            }

            return true;
        });
    }

    private toDomain(raw: any): Payment {
        return {
            id: raw.id,
            bookingId: raw.bookingId,
            eventId: raw.eventId,
            userId: raw.userId,
            txid: raw.txid,
            pixCopiaECola: raw.pixCopiaECola,
            qrcode: raw.qrcode,
            provider: raw.provider,
            checkoutUrl: raw.checkoutUrl ?? undefined,
            providerPaymentId: raw.providerPaymentId ?? undefined,
            paymentMethod: raw.paymentMethod ?? undefined,
            providerStatus: raw.providerStatus ?? undefined,
            valor: Number(raw.valor),
            status: raw.status as PaymentStatus,
            paidAt: raw.paidAt ?? undefined,
            platformFee: raw.platformFee ? Number(raw.platformFee) : undefined,
            processorFee: raw.processorFee !== null ? Number(raw.processorFee) : undefined,
            netAmount: raw.netAmount ? Number(raw.netAmount) : undefined,
            refundedAmount: raw.refundedAmount !== null ? Number(raw.refundedAmount) : undefined,
            refundedNetAmount: raw.refundedNetAmount !== null ? Number(raw.refundedNetAmount) : undefined,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        };
    }
}
