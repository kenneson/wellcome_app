import { Payment } from '../entities/Payment';

export type ProcessingFeePayer = 'PLATFORM' | 'HOST';

export interface PaymentEconomicsBreakdown {
    paymentId: string;
    eventId: string;
    grossCaptured: number;
    grossRefunded: number;
    grossRetained: number;
    platformFee: number;
    refundedPlatformFee: number;
    processorFee: number;
    refundedProcessorFee: number;
    processorFeePayer: ProcessingFeePayer;
    hostNetRetained: number;
    realizedPlatformMargin: number;
    realizedMarginPercentage: number | null;
}

export const DEFAULT_MIN_WITHDRAWAL_AMOUNT = 50;

export function getMinimumWithdrawalAmount(rawValue = process.env.MIN_WITHDRAWAL_AMOUNT): number {
    const parsed = Number(rawValue ?? DEFAULT_MIN_WITHDRAWAL_AMOUNT);
    if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MIN_WITHDRAWAL_AMOUNT;
    return Number(Math.min(100000, parsed).toFixed(2));
}

export function getProcessingFeePayer(rawValue = process.env.PAYMENT_PROCESSING_FEE_PAYER): ProcessingFeePayer {
    return rawValue === 'HOST' ? 'HOST' : 'PLATFORM';
}

export function calculateSettlementEconomics(
    grossAmount: number,
    platformFee: number,
    processorFee: number,
    processorFeePayer: ProcessingFeePayer
): { hostNetAmount: number; platformMargin: number } {
    const processorCostForHost = processorFeePayer === 'HOST' ? processorFee : 0;
    const processorCostForPlatform = processorFeePayer === 'PLATFORM' ? processorFee : 0;
    return {
        hostNetAmount: money(Math.max(0, grossAmount - platformFee - processorCostForHost)),
        platformMargin: money(platformFee - processorCostForPlatform),
    };
}

export function calculateRealizedPaymentEconomics(payment: Payment): PaymentEconomicsBreakdown {
    const grossCaptured = money(payment.valor);
    const grossRefunded = money(Math.min(grossCaptured, Math.max(0, payment.refundedAmount || 0)));
    const grossRetained = money(Math.max(0, grossCaptured - grossRefunded));
    const platformFee = money(payment.platformFee || 0);
    const refundedPlatformFee = money(Math.min(platformFee, Math.max(0, payment.refundedPlatformFee || 0)));
    const processorFee = money(payment.processorFee || 0);
    const refundedProcessorFee = money(Math.min(processorFee, Math.max(0, payment.refundedProcessorFee || 0)));
    const processorFeePayer = payment.processorFeePayer === 'HOST' ? 'HOST' : 'PLATFORM';
    const processorCost = processorFeePayer === 'PLATFORM'
        ? money(Math.max(0, processorFee - refundedProcessorFee))
        : 0;
    const realizedPlatformMargin = money(platformFee - refundedPlatformFee - processorCost);
    const hostNetRetained = money(Math.max(0, (payment.netAmount || 0) - (payment.refundedNetAmount || 0)));

    return {
        paymentId: payment.id,
        eventId: payment.eventId,
        grossCaptured,
        grossRefunded,
        grossRetained,
        platformFee,
        refundedPlatformFee,
        processorFee,
        refundedProcessorFee,
        processorFeePayer,
        hostNetRetained,
        realizedPlatformMargin,
        realizedMarginPercentage: grossRetained > 0
            ? money((realizedPlatformMargin / grossRetained) * 100)
            : null,
    };
}

function money(value: number): number {
    return Number(Number(value || 0).toFixed(2));
}
