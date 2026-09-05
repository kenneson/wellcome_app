import { RegistrationRefundService } from '../RegistrationRefundService';

describe('automatic registration refunds', () => {
    const payment = { id: 'payment-1', eventId: 'event-1', providerPaymentId: 'pay-1', valor: 100, refundedAmount: 0 };
    const paid = { id: 'pay-1', status: 'RECEIVED', refunds: [] };
    const payments = {
        withRegistrationRefundLock: jest.fn(), applyRefund: jest.fn(), listRefundCandidates: jest.fn(),
    };
    const gateway = { getPayment: jest.fn(), refundPayment: jest.fn() };
    const events = { findById: jest.fn() };
    const service = new RegistrationRefundService(payments as any, gateway as any, events as any);
    beforeEach(() => {
        jest.resetAllMocks();
        payments.withRegistrationRefundLock.mockImplementation(async (_id, action) => action(payment));
        events.findById.mockResolvedValue({ hostId: 'host-1' });
        gateway.getPayment.mockResolvedValue(paid);
        gateway.refundPayment.mockResolvedValue({ ...paid, status: 'REFUND_REQUESTED' });
    });
    it('requests the full gross value, not the amount after fees', async () => {
        await service.execute(payment.id);
        expect(gateway.refundPayment).toHaveBeenCalledWith('pay-1', 100, expect.any(String));
        expect(payments.applyRefund).not.toHaveBeenCalled();
    });
    it.each([
        { ...paid, status: 'REFUND_REQUESTED' },
        { ...paid, refunds: [{ status: 'PENDING', value: 100 }] },
    ])('does not repeat a refund that is already processing', async (remote) => {
        gateway.getPayment.mockResolvedValue(remote);
        await service.execute(payment.id);
        expect(gateway.refundPayment).not.toHaveBeenCalled();
        expect(payments.applyRefund).not.toHaveBeenCalled();
    });
    it('reconciles completed refunds after a retry without issuing another', async () => {
        gateway.getPayment.mockResolvedValue({ ...paid, status: 'REFUNDED' });
        await service.execute(payment.id);
        expect(gateway.refundPayment).not.toHaveBeenCalled();
        expect(payments.applyRefund).toHaveBeenCalledWith(expect.objectContaining({ refundedAmount: 100, targetStatus: 'REFUNDED' }));
    });
    it('refunds only the remainder of a partial refund', async () => {
        gateway.getPayment.mockResolvedValue({ ...paid, refunds: [{ status: 'DONE', value: 30 }] });
        await service.execute(payment.id);
        expect(gateway.refundPayment).toHaveBeenCalledWith('pay-1', 70, expect.any(String));
    });
    it('skips registrations that are no longer refund candidates under the lock', async () => {
        payments.withRegistrationRefundLock.mockResolvedValue(null);
        await service.execute(payment.id);
        expect(gateway.getPayment).not.toHaveBeenCalled();
    });
    it('retries a failed refund on the next reconciliation cycle', async () => {
        const log = jest.spyOn(console, 'error').mockImplementation(() => {});
        payments.listRefundCandidates.mockResolvedValue([payment]);
        gateway.getPayment.mockRejectedValueOnce(new Error('Temporary error'));
        await service.reconcile();
        await service.reconcile();
        expect(gateway.refundPayment).toHaveBeenCalledTimes(1);
        log.mockRestore();
    });
});
