import { ProviderPayment } from './PaymentGateway';

const SETTLED_STATUSES = ['RECEIVED', 'RECEIVED_IN_CASH'];

export function isProviderSettlementStatus(status: string | null | undefined): boolean {
    return Boolean(status && SETTLED_STATUSES.includes(status));
}

export function isProviderPaymentSettled(payment: ProviderPayment): boolean {
    return isProviderSettlementStatus(payment.status);
}

/**
 * Whether the guest payment is completed and the booking can be confirmed.
 *
 * Asaas uses CONFIRMED for a successfully captured credit-card payment before
 * the receivable reaches the account. Pix CONFIRMED can still be under a
 * precautionary review, so Pix only becomes paid when it is RECEIVED.
 */
export function isProviderPaymentPaid(payment: ProviderPayment): boolean {
    return isProviderPaymentSettled(payment)
        || (payment.billingType === 'CREDIT_CARD' && payment.status === 'CONFIRMED');
}
