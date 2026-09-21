import { hostCancellationFee, participantPenaltyRate, participantRefundTarget } from '../CancellationPolicy';

describe('cancellation policy', () => {
    const now = new Date('2026-09-01T12:00:00Z');

    it('refunds in full at least 7 days before the event and charges 50% after', () => {
        expect(participantPenaltyRate('2026-09-08T12:00:00Z', now)).toBe(0);
        expect(participantPenaltyRate('2026-09-08T11:59:59Z', now)).toBe(0.5);
    });

    it('never lowers a refund that already happened', () => {
        expect(participantRefundTarget(100, 0, 0.5)).toBe(50);
        expect(participantRefundTarget(100, 70, 0.5)).toBe(70);
        expect(participantRefundTarget(100, 0, 0)).toBe(100);
    });

    it('charges the host only the processor fee that is not returned', () => {
        expect(hostCancellationFee({ processorFee: 1.99, paymentMethod: 'PIX' })).toBe(1.99);
        expect(hostCancellationFee({ processorFee: 4.5, paymentMethod: 'CREDIT_CARD' })).toBe(0);
        expect(hostCancellationFee({})).toBe(0);
    });
});
