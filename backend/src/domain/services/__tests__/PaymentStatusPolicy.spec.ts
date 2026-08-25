import { isProviderPaymentPaid, isProviderPaymentSettled } from '../PaymentStatusPolicy';

describe('PaymentStatusPolicy', () => {
    it('requires RECEIVED for Pix settlement', () => {
        expect(isProviderPaymentSettled({
            id: 'pay-pix', billingType: 'PIX', status: 'CONFIRMED', value: 10, netValue: 9.5,
        })).toBe(false);
        expect(isProviderPaymentPaid({
            id: 'pay-pix', billingType: 'PIX', status: 'CONFIRMED', value: 10, netValue: 9.5,
        })).toBe(false);
        expect(isProviderPaymentSettled({
            id: 'pay-pix', billingType: 'PIX', status: 'RECEIVED', value: 10, netValue: 9.5,
        })).toBe(true);
    });

    it('confirms the booking for a captured card without releasing funds early', () => {
        expect(isProviderPaymentSettled({
            id: 'pay-card', billingType: 'CREDIT_CARD', status: 'CONFIRMED', value: 10, netValue: 9.5,
        })).toBe(false);
        expect(isProviderPaymentPaid({
            id: 'pay-card', billingType: 'CREDIT_CARD', status: 'CONFIRMED', value: 10, netValue: 9.5,
        })).toBe(true);
        expect(isProviderPaymentSettled({
            id: 'pay-card', billingType: 'CREDIT_CARD', status: 'RECEIVED', value: 10, netValue: 9.5,
        })).toBe(true);
    });
});
