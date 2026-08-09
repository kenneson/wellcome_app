import { isProviderPaymentSettled } from '../PaymentStatusPolicy';

describe('PaymentStatusPolicy', () => {
    it('requires RECEIVED for Pix settlement', () => {
        expect(isProviderPaymentSettled({
            id: 'pay-pix', billingType: 'PIX', status: 'CONFIRMED', value: 10, netValue: 9.5,
        })).toBe(false);
        expect(isProviderPaymentSettled({
            id: 'pay-pix', billingType: 'PIX', status: 'RECEIVED', value: 10, netValue: 9.5,
        })).toBe(true);
    });

    it('does not release card funds before they are received', () => {
        expect(isProviderPaymentSettled({
            id: 'pay-card', billingType: 'CREDIT_CARD', status: 'CONFIRMED', value: 10, netValue: 9.5,
        })).toBe(false);
        expect(isProviderPaymentSettled({
            id: 'pay-card', billingType: 'CREDIT_CARD', status: 'RECEIVED', value: 10, netValue: 9.5,
        })).toBe(true);
    });
});
