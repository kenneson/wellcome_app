import { ProviderPayment } from './PaymentGateway';

export function isProviderPaymentSettled(payment: ProviderPayment): boolean {
    return ['RECEIVED', 'RECEIVED_IN_CASH'].includes(payment.status);
}
