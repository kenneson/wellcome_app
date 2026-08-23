import {
    calculateRealizedPaymentEconomics,
    calculateSettlementEconomics,
    getMinimumWithdrawalAmount,
} from '../PaymentEconomics';
import { Payment } from '../../entities/Payment';
import { PaymentStatus } from '../../value-objects/PaymentStatus';

function payment(overrides: Partial<Payment> = {}): Payment {
    return {
        id: 'payment-1',
        bookingId: 'booking-1',
        eventId: 'event-1',
        userId: 'user-1',
        txid: 'tx-1',
        pixCopiaECola: '',
        qrcode: '',
        valor: 100,
        status: PaymentStatus.CONFIRMED,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

describe('PaymentEconomics', () => {
    it('subtracts processor cost from platform margin when the platform pays it', () => {
        expect(calculateSettlementEconomics(100, 10, 2, 'PLATFORM')).toEqual({
            hostNetAmount: 90,
            platformMargin: 8,
        });
    });

    it('subtracts processor cost from host proceeds when the host pays it', () => {
        expect(calculateSettlementEconomics(100, 10, 2, 'HOST')).toEqual({
            hostNetAmount: 88,
            platformMargin: 10,
        });
    });

    it('calculates realized margin after a partial refund', () => {
        expect(calculateRealizedPaymentEconomics(payment({
            platformFee: 10,
            processorFee: 2,
            processorFeePayer: 'PLATFORM',
            netAmount: 90,
            refundedAmount: 40,
            refundedNetAmount: 36,
            refundedPlatformFee: 4,
        }))).toMatchObject({
            grossRetained: 60,
            hostNetRetained: 54,
            realizedPlatformMargin: 4,
            realizedMarginPercentage: 6.67,
        });
    });

    it('does not report margin after a full card refund with returned fees', () => {
        expect(calculateRealizedPaymentEconomics(payment({
            status: PaymentStatus.REFUNDED,
            platformFee: 10,
            processorFee: 2,
            processorFeePayer: 'PLATFORM',
            netAmount: 90,
            refundedAmount: 100,
            refundedNetAmount: 90,
            refundedPlatformFee: 10,
            refundedProcessorFee: 2,
        }))).toMatchObject({
            grossRetained: 0,
            hostNetRetained: 0,
            realizedPlatformMargin: 0,
            realizedMarginPercentage: null,
        });
    });

    it('falls back to the safe default for invalid withdrawal configuration', () => {
        expect(getMinimumWithdrawalAmount('invalid')).toBe(50);
        expect(getMinimumWithdrawalAmount('-10')).toBe(50);
    });
});
