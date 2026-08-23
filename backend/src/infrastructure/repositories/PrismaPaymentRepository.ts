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

    async resetForProviderPayment(id: string): Promise<boolean> {
        const reset = await prisma.payment.updateMany({
            where: { id, status: { in: [PaymentStatus.PENDING, PaymentStatus.EXPIRED] } },
            data: {
                status: PaymentStatus.PENDING,
                provider: 'ASAAS',
                providerStatus: 'NEW',
                checkoutUrl: null,
                providerPaymentId: null,
                paymentMethod: null,
                pixCopiaECola: '',
                qrcode: '',
                pixExpirationDate: null,
            },
        });
        return reset.count === 1;
    }

    async claimProviderPaymentCreation(id: string, value: number): Promise<boolean> {
        const claimed = await prisma.payment.updateMany({
            where: {
                id,
                status: PaymentStatus.PENDING,
                checkoutUrl: null,
                providerPaymentId: null,
                OR: [
                    { providerStatus: null },
                    { providerStatus: { in: ['NEW', 'FAILED', 'EXPIRED', 'DELETED'] } },
                ],
            },
            data: {
                provider: 'ASAAS',
                providerStatus: 'CREATING',
                paymentMethod: null,
                pixCopiaECola: '',
                qrcode: '',
                pixExpirationDate: null,
                valor: value,
            },
        });
        return claimed.count === 1;
    }

    async saveProviderPayment(data: {
        paymentId: string;
        providerPaymentId: string;
        providerStatus: string;
        value: number;
    }): Promise<Payment> {
        const payment = await prisma.payment.update({
            where: { id: data.paymentId },
            data: {
                txid: data.providerPaymentId,
                providerPaymentId: data.providerPaymentId,
                providerStatus: data.providerStatus,
                valor: data.value,
                checkoutUrl: null,
            },
        });
        return this.toDomain(payment);
    }

    async savePixData(data: {
        paymentId: string;
        payload: string;
        expirationDate: Date;
    }): Promise<Payment> {
        const payment = await prisma.payment.update({
            where: { id: data.paymentId },
            data: {
                pixCopiaECola: data.payload,
                pixExpirationDate: data.expirationDate,
                paymentMethod: 'PIX',
            },
        });
        return this.toDomain(payment);
    }

    async claimCardPaymentAttempt(paymentId: string, providerPaymentId: string): Promise<boolean> {
        const claimed = await prisma.payment.updateMany({
            where: {
                id: paymentId,
                providerPaymentId,
                status: PaymentStatus.PENDING,
                OR: [
                    { providerStatus: { not: 'PROCESSING_CARD' } },
                    { updatedAt: { lt: new Date(Date.now() - 120_000) } },
                ],
            },
            data: {
                paymentMethod: 'CREDIT_CARD',
                providerStatus: 'PROCESSING_CARD',
            },
        });
        return claimed.count === 1;
    }

    async claimCheckoutCreation(id: string, value: number): Promise<boolean> {
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
                pixExpirationDate: null,
                valor: value,
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

    async confirmAndHoldHostFunds(data: {
        paymentId: string;
        bookingId: string;
        hostId: string;
        platformFee: number;
        processorFee?: number;
        processorFeePayer?: 'PLATFORM' | 'HOST';
        platformMargin?: number;
        netAmount: number;
        paidAt: Date;
        providerStatus?: string;
        approveBookingOnPayment?: boolean;
        fundsAvailableAt: Date;
    }): Promise<boolean> {
        return prisma.$transaction(async (tx) => {
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
                    processorFeePayer: data.processorFeePayer ?? 'PLATFORM',
                    platformMargin: data.platformMargin ?? data.platformFee - (data.processorFee ?? 0),
                    netAmount: data.netAmount,
                    ...(data.providerStatus && { providerStatus: data.providerStatus }),
                },
            });

            if (updated.count === 0) {
                return false;
            }

            if (data.approveBookingOnPayment) {
                await tx.booking.updateMany({
                    where: {
                        id: data.bookingId,
                        status: 'PENDING',
                    },
                    data: { status: 'APPROVED' },
                });
            }

            const booking = await tx.booking.findUnique({
                where: { id: data.bookingId },
                select: { status: true },
            });

            if (booking?.status === 'APPROVED') {
                await this.holdHostFundsInTransaction(
                    tx,
                    data.paymentId,
                    data.hostId,
                    data.fundsAvailableAt
                );
            }

            return true;
        });
    }

    async holdHostFunds(data: {
        paymentId: string;
        hostId: string;
        fundsAvailableAt: Date;
    }): Promise<boolean> {
        return prisma.$transaction(async (tx) => {
            return this.holdHostFundsInTransaction(
                tx,
                data.paymentId,
                data.hostId,
                data.fundsAvailableAt
            );
        });
    }

    private async holdHostFundsInTransaction(
        tx: any,
        paymentId: string,
        hostId: string,
        fundsAvailableAt: Date
    ): Promise<boolean> {
        await tx.$queryRaw`
            select id
            from public.payments
            where id = cast(${paymentId} as uuid)
            for update
        `;

        const payment = await tx.payment.findUnique({
            where: { id: paymentId },
            select: {
                id: true,
                status: true,
                netAmount: true,
                refundedNetAmount: true,
                fundsHeldAt: true,
                booking: { select: { event: { select: { hostId: true } } } },
            },
        });

        if (
            !payment ||
            ![PaymentStatus.CONFIRMED, PaymentStatus.PARTIALLY_REFUNDED].includes(payment.status) ||
            !payment.netAmount ||
            payment.fundsHeldAt ||
            payment.booking.event.hostId !== hostId
        ) {
            return false;
        }

        const existingCredit = await tx.walletTransaction.findFirst({
            where: {
                referenceId: paymentId,
                type: 'CREDIT_EVENT_TICKET',
            },
            select: { id: true },
        });

        if (existingCredit) {
            return false;
        }

        const heldAmount = Number(
            (Number(payment.netAmount) - Number(payment.refundedNetAmount)).toFixed(2)
        );
        if (heldAmount <= 0) {
            return false;
        }

        await tx.user.update({
            where: { id: hostId },
            data: {
                pendingWalletBalance: { increment: heldAmount },
            },
        });

        await tx.payment.update({
            where: { id: paymentId },
            data: {
                fundsHeldAt: new Date(),
                fundsAvailableAt,
            },
        });

        return true;
    }

    async releaseMaturedHostFunds(hostId: string, now = new Date()): Promise<number> {
        const candidates = await prisma.payment.findMany({
            where: {
                status: { in: [PaymentStatus.CONFIRMED, PaymentStatus.PARTIALLY_REFUNDED] },
                fundsHeldAt: { not: null },
                fundsAvailableAt: { lte: now },
                fundsReleasedAt: null,
                booking: {
                    status: 'APPROVED',
                    event: { hostId },
                },
            },
            select: { id: true },
            orderBy: { id: 'asc' },
            take: 100,
        });

        let releasedTotal = 0;
        for (const candidate of candidates) {
            releasedTotal += await prisma.$transaction((tx) =>
                this.releaseMaturedHostFundsInTransaction(tx, candidate.id, hostId, now)
            );
        }
        return Number(releasedTotal.toFixed(2));
    }

    private async releaseMaturedHostFundsInTransaction(
        tx: any,
        paymentId: string,
        hostId: string,
        now: Date
    ): Promise<number> {
        await tx.$queryRaw`
            select id
            from public.payments
            where id = cast(${paymentId} as uuid)
            for update
        `;

        const payment = await tx.payment.findUnique({
            where: { id: paymentId },
            select: {
                status: true,
                netAmount: true,
                refundedNetAmount: true,
                fundsHeldAt: true,
                fundsAvailableAt: true,
                fundsReleasedAt: true,
                booking: {
                    select: {
                        status: true,
                        event: { select: { hostId: true } },
                    },
                },
            },
        });

        if (
            !payment ||
            ![PaymentStatus.CONFIRMED, PaymentStatus.PARTIALLY_REFUNDED].includes(payment.status) ||
            !payment.fundsHeldAt ||
            !payment.fundsAvailableAt ||
            payment.fundsAvailableAt > now ||
            payment.fundsReleasedAt ||
            payment.booking.status !== 'APPROVED' ||
            payment.booking.event.hostId !== hostId
        ) {
            return 0;
        }

        const amount = Number(
            (Number(payment.netAmount) - Number(payment.refundedNetAmount)).toFixed(2)
        );

        if (amount <= 0) {
            await tx.payment.update({
                where: { id: paymentId },
                data: { fundsReleasedAt: now },
            });
            return 0;
        }

        const balanceUpdated = await tx.user.updateMany({
            where: {
                id: hostId,
                pendingWalletBalance: { gte: amount },
            },
            data: {
                pendingWalletBalance: { decrement: amount },
                walletBalance: { increment: amount },
            },
        });
        if (balanceUpdated.count !== 1) {
            throw new Error(`Pending wallet balance invariant failed for payment ${paymentId}`);
        }

        await tx.walletTransaction.create({
            data: {
                userId: hostId,
                amount,
                type: 'CREDIT_EVENT_TICKET',
                description: 'Pagamento de inscricao liberado apos o evento',
                referenceId: paymentId,
            },
        });

        await tx.payment.update({
            where: { id: paymentId },
            data: { fundsReleasedAt: now },
        });

        return amount;
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
            await tx.$queryRaw`
                select id
                from public.payments
                where id = cast(${data.paymentId} as uuid)
                for update
            `;
            const payment = await tx.payment.findUnique({
                where: { id: data.paymentId },
            });

            if (!payment || !payment.netAmount || Number(payment.valor) <= 0) {
                return false;
            }

            const existingCredit = await tx.walletTransaction.findFirst({
                where: {
                    referenceId: payment.id,
                    type: 'CREDIT_EVENT_TICKET',
                },
                select: { id: true },
            });

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
            const nextRefundedPlatformFee = Number(
                ((Number(payment.platformFee || 0) * nextRefundedAmount) / grossValue).toFixed(2)
            );
            const processorFeeReturned = isFullRefund
                && payment.paymentMethod === 'CREDIT_CARD'
                ? Number(payment.processorFee || 0)
                : Number(payment.refundedProcessorFee || 0);
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
                    refundedPlatformFee: nextRefundedPlatformFee,
                    refundedProcessorFee: processorFeeReturned,
                    ...(isFullRefund && payment.fundsHeldAt && !payment.fundsReleasedAt
                        ? { fundsReleasedAt: new Date() }
                        : {}),
                },
            });

            if (refundedNetDelta > 0 && payment.fundsHeldAt && !payment.fundsReleasedAt) {
                const balanceUpdated = await tx.user.updateMany({
                    where: {
                        id: data.hostId,
                        pendingWalletBalance: { gte: refundedNetDelta },
                    },
                    data: {
                        pendingWalletBalance: { decrement: refundedNetDelta },
                    },
                });
                if (balanceUpdated.count !== 1) {
                    throw new Error(`Pending wallet balance invariant failed for payment ${payment.id}`);
                }
            } else if (refundedNetDelta > 0 && existingCredit) {
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
            pixExpirationDate: raw.pixExpirationDate ?? undefined,
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
            processorFeePayer: raw.processorFeePayer === 'HOST' ? 'HOST' : 'PLATFORM',
            platformMargin: raw.platformMargin !== null ? Number(raw.platformMargin) : undefined,
            refundedPlatformFee: raw.refundedPlatformFee !== null ? Number(raw.refundedPlatformFee) : undefined,
            refundedProcessorFee: raw.refundedProcessorFee !== null ? Number(raw.refundedProcessorFee) : undefined,
            netAmount: raw.netAmount ? Number(raw.netAmount) : undefined,
            refundedAmount: raw.refundedAmount !== null ? Number(raw.refundedAmount) : undefined,
            refundedNetAmount: raw.refundedNetAmount !== null ? Number(raw.refundedNetAmount) : undefined,
            fundsHeldAt: raw.fundsHeldAt ?? undefined,
            fundsAvailableAt: raw.fundsAvailableAt ?? undefined,
            fundsReleasedAt: raw.fundsReleasedAt ?? undefined,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        };
    }

    async listSettledForEconomics(limit = 100): Promise<Payment[]> {
        const payments = await prisma.payment.findMany({
            where: {
                status: {
                    in: [
                        PaymentStatus.CONFIRMED,
                        PaymentStatus.PARTIALLY_REFUNDED,
                        PaymentStatus.REFUNDED,
                        PaymentStatus.CHARGEBACK,
                    ],
                },
            },
            orderBy: [{ paidAt: 'desc' }, { id: 'desc' }],
            take: Math.min(500, Math.max(1, limit)),
        });
        return payments.map((payment) => this.toDomain(payment));
    }
}
