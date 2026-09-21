import { CancelEventRegistrationUseCase } from '../CancelEventRegistrationUseCase';
import { PaymentStatus } from '../../../domain/value-objects/PaymentStatus';

describe('CancelEventRegistrationUseCase', () => {
    const DAY = 24 * 60 * 60 * 1000;
    const event = {
        id: 'event-1',
        title: 'Jantar',
        eventDate: new Date(Date.now() + 60_000),
        host: { id: 'host-1', expoPushToken: null },
    };
    const registration = {
        id: 'booking-1',
        eventId: 'event-1',
        userId: 'guest-1',
        status: 'APPROVED',
        user: { fullName: 'Convidado' },
    };
    const paidPayment = {
        id: 'payment-1',
        providerPaymentId: 'asaas-1',
        status: PaymentStatus.CONFIRMED,
        valor: 100,
        refundedAmount: 0,
    };

    const registrations = {
        findByUserId: jest.fn(),
        cancelByParticipant: jest.fn(),
        deleteByEventAndUser: jest.fn(),
    };
    const events = { findById: jest.fn() };
    const notifications = { execute: jest.fn() };
    const payments = { findByBookingId: jest.fn(), updateStatus: jest.fn() };
    const gateway = { refundPayment: jest.fn(), deletePayment: jest.fn(), cancelCheckout: jest.fn() };
    const refunds = { execute: jest.fn() };

    const useCase = new CancelEventRegistrationUseCase(
        registrations as any,
        events as any,
        notifications as any,
        payments as any,
        gateway as any,
        undefined,
        refunds as any
    );

    beforeEach(() => {
        jest.clearAllMocks();
        events.findById.mockResolvedValue(event);
        registrations.findByUserId.mockResolvedValue([registration]);
        payments.findByBookingId.mockResolvedValue(null);
        refunds.execute.mockResolvedValue(undefined);
    });

    it('preserves the booking history by changing its status instead of deleting it', async () => {
        await useCase.execute('event-1', 'guest-1');

        expect(registrations.cancelByParticipant).toHaveBeenCalledWith('booking-1', {});
        expect(registrations.deleteByEventAndUser).not.toHaveBeenCalled();
        expect(refunds.execute).not.toHaveBeenCalled();
    });

    it('charges 50% when a confirmed guest cancels less than 7 days before', async () => {
        payments.findByBookingId.mockResolvedValue(paidPayment);

        await useCase.execute('event-1', 'guest-1');

        expect(registrations.cancelByParticipant).toHaveBeenCalledWith('booking-1',
            expect.objectContaining({ penaltyRate: 0.5, refundTargetAmount: 50 }));
        expect(registrations.cancelByParticipant.mock.invocationCallOrder[0])
            .toBeLessThan(refunds.execute.mock.invocationCallOrder[0]);
        expect(refunds.execute).toHaveBeenCalledWith('payment-1');
    });

    it('refunds in full when cancelled 7 or more days before', async () => {
        events.findById.mockResolvedValue({ ...event, eventDate: new Date(Date.now() + 8 * DAY) });
        payments.findByBookingId.mockResolvedValue(paidPayment);

        await useCase.execute('event-1', 'guest-1');

        expect(registrations.cancelByParticipant).toHaveBeenCalledWith('booking-1',
            expect.objectContaining({ penaltyRate: 0, refundTargetAmount: 100 }));
    });

    it('refunds in full when the host has not approved the guest yet', async () => {
        registrations.findByUserId.mockResolvedValue([{ ...registration, status: 'PENDING' }]);
        payments.findByBookingId.mockResolvedValue(paidPayment);

        await useCase.execute('event-1', 'guest-1');

        expect(registrations.cancelByParticipant).toHaveBeenCalledWith('booking-1',
            expect.objectContaining({ penaltyRate: 0, refundTargetAmount: 100 }));
    });

    it('keeps the cancellation when the provider refund fails; the worker retries', async () => {
        const log = jest.spyOn(console, 'error').mockImplementation(() => {});
        payments.findByBookingId.mockResolvedValue(paidPayment);
        refunds.execute.mockRejectedValue(new Error('Provider unavailable'));

        await useCase.execute('event-1', 'guest-1');

        expect(registrations.cancelByParticipant).toHaveBeenCalled();
        log.mockRestore();
    });

    it('cancels a pending provider payment before changing the booking status', async () => {
        payments.findByBookingId.mockResolvedValue({
            id: 'payment-1',
            providerPaymentId: 'asaas-1',
            status: PaymentStatus.PENDING,
            txid: 'tx-1',
        });

        await useCase.execute('event-1', 'guest-1');

        expect(gateway.deletePayment).toHaveBeenCalledWith('asaas-1');
        expect(payments.updateStatus).toHaveBeenCalledWith('payment-1', PaymentStatus.EXPIRED);
        expect(registrations.cancelByParticipant).toHaveBeenCalledWith('booking-1', {});
    });

    it('is idempotent after the registration is already cancelled', async () => {
        registrations.findByUserId.mockResolvedValue([{ ...registration, status: 'CANCELLED' }]);

        await useCase.execute('event-1', 'guest-1');

        expect(payments.findByBookingId).not.toHaveBeenCalled();
        expect(registrations.cancelByParticipant).not.toHaveBeenCalled();
    });
});
