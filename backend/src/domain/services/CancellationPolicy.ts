// ponytail: single fixed window; move to event-level settings if hosts need their own policy.
export const FULL_REFUND_MIN_DAYS_BEFORE = 7;
export const LATE_CANCELLATION_PENALTY_RATE = 0.5;

const DAY_MS = 24 * 60 * 60 * 1000;

export function participantPenaltyRate(eventDate: Date | string, now = new Date()): number {
    const msBefore = new Date(eventDate).getTime() - now.getTime();
    return msBefore >= FULL_REFUND_MIN_DAYS_BEFORE * DAY_MS ? 0 : LATE_CANCELLATION_PENALTY_RATE;
}

/** Cumulative gross amount the participant must get back. Never lowers an existing refund. */
export function participantRefundTarget(valor: number, alreadyRefunded: number, penaltyRate: number): number {
    return Number(Math.max(alreadyRefunded, valor * (1 - penaltyRate)).toFixed(2));
}

/**
 * Fee charged to a host who cancels a paid event: the processor fee Asaas keeps.
 * Card fees come back on a full refund (same assumption as applyRefund), so they cost nothing.
 */
export function hostCancellationFee(payment: { processorFee?: number | null; paymentMethod?: string | null }): number {
    if (payment.paymentMethod === 'CREDIT_CARD') return 0;
    return Number(Number(payment.processorFee || 0).toFixed(2));
}
