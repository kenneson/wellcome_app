import { ProviderPayment } from './PaymentGateway';

export function isProviderPaymentSettled(payment: ProviderPayment): boolean {
    if (payment.billingType === 'PIX') {
        return ['RECEIVED', 'RECEIVED_IN_CASH'].includes(payment.status);
    }
    return ['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH'].includes(payment.status);
}
