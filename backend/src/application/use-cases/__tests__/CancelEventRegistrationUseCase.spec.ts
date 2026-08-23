import { CancelEventRegistrationUseCase } from '../CancelEventRegistrationUseCase';
import { PaymentStatus } from '../../../domain/value-objects/PaymentStatus';

describe('CancelEventRegistrationUseCase', () => {
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
        status: 'PENDING',
        user: { fullName: 'Convidado' },
    };

    const registrations = {
        findByUserId: jest.fn(),
        updateStatus: jest.fn(),
        deleteByEventAndUser: jest.fn(),
    };
    const events = {
        findById: jest.fn(),
    };
    const notifications = {
        execute: jest.fn(),
    };
    const payments = {
        findByBookingId: jest.fn(),
        updateStatus: jest.fn(),
    };
    const gateway = {
        refundPayment: jest.fn(),
        deletePayment: jest.fn(),
        cancelCheckout: jest.fn(),
    };

    const useCase = new CancelEventRegistrationUseCase(
        registrations as any,
        events as any,
        notifications as any,
        payments as any,
        gateway as any
    );

    beforeEach(() => {
        jest.clearAllMocks();
        events.findById.mockResolvedValue(event);
        registrations.findByUserId.mockResolvedValue([registration]);
        registrations.updateStatus.mockResolvedValue({ ...registration, status: 'CANCELLED' });
        payments.findByBookingId.mockResolvedValue(null);
    });

    it('preserves the booking history by changing its status instead of deleting it', async () => {
        await useCase.execute('event-1', 'guest-1');

        expect(registrations.updateStatus).toHaveBeenCalledWith('booking-1', 'CANCELLED');
        expect(registrations.deleteByEventAndUser).not.toHaveBeenCalled();
        expect(gateway.refundPayment).not.toHaveBeenCalled();
    });

    it('requests the remaining refund before cancelling a paid registration', async () => {
        payments.findByBookingId.mockResolvedValue({
            id: 'payment-1',
            providerPaymentId: 'asaas-1',
            status: PaymentStatus.PARTIALLY_REFUNDED,
            valor: 100,
            refundedAmount: 20,
        });
        gateway.refundPayment.mockResolvedValue({ id: 'asaas-1', status: 'REFUND_REQUESTED' });

        await useCase.execute('event-1', 'guest-1');

        expect(gateway.refundPayment).toHaveBeenCalledWith(
            'asaas-1',
            80,
            'Inscricao cancelada pelo participante'
        );
        expect(gateway.refundPayment.mock.invocationCallOrder[0])
            .toBeLessThan(registrations.updateStatus.mock.invocationCallOrder[0]);
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
        expect(registrations.updateStatus).toHaveBeenCalledWith('booking-1', 'CANCELLED');
    });

    it('does not cancel the booking locally when the refund request fails', async () => {
        payments.findByBookingId.mockResolvedValue({
            id: 'payment-1',
            providerPaymentId: 'asaas-1',
            status: PaymentStatus.CONFIRMED,
            valor: 100,
            refundedAmount: 0,
        });
        gateway.refundPayment.mockRejectedValue(new Error('Provider unavailable'));

        await expect(useCase.execute('event-1', 'guest-1')).rejects.toThrow('Provider unavailable');

        expect(registrations.updateStatus).not.toHaveBeenCalled();
    });

    it('is idempotent after the registration is already cancelled', async () => {
        registrations.findByUserId.mockResolvedValue([
            { ...registration, status: 'CANCELLED' },
        ]);

        await useCase.execute('event-1', 'guest-1');

        expect(payments.findByBookingId).not.toHaveBeenCalled();
        expect(registrations.updateStatus).not.toHaveBeenCalled();
        expect(gateway.refundPayment).not.toHaveBeenCalled();
    });
});
