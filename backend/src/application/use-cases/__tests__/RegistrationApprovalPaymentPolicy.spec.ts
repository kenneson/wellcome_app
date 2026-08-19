import { PaymentStatus } from '../../../domain/value-objects/PaymentStatus';
import { ApproveRegistrationUseCase } from '../ApproveRegistrationUseCase';
import { RejectRegistrationUseCase } from '../RejectRegistrationUseCase';

const futureEvent = {
    id: 'event-1',
    hostId: 'host-1',
    title: 'Jantar pago',
    eventDate: new Date(Date.now() + 60 * 60 * 1000),
    price: 100,
} as any;

const registration = {
    id: 'booking-1',
    eventId: 'event-1',
    userId: 'guest-1',
    status: 'PENDING',
    event: futureEvent,
    user: { id: 'guest-1', expoPushToken: null },
    attendedBefore: false,
    noShowCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
} as any;

function registrationRepository() {
    return {
        create: jest.fn(),
        findByEventId: jest.fn(),
        findByEventIdWithUser: jest.fn(),
        findByUserId: jest.fn(),
        delete: jest.fn(),
        deleteByEventAndUser: jest.fn(),
        updateStatus: jest.fn().mockResolvedValue({ ...registration, status: 'APPROVED' }),
        findById: jest.fn().mockResolvedValue(registration),
    };
}

function paymentRepository(payment?: any) {
    return {
        create: jest.fn(),
        findByBookingId: jest.fn().mockResolvedValue(payment ?? null),
        findByTxid: jest.fn(),
        findByProviderPaymentId: jest.fn(),
        resetForProviderPayment: jest.fn(),
        claimProviderPaymentCreation: jest.fn(),
        saveProviderPayment: jest.fn(),
        savePixData: jest.fn(),
        claimCardPaymentAttempt: jest.fn(),
        claimCheckoutCreation: jest.fn(),
        saveCheckout: jest.fn(),
        markCheckoutCreationFailed: jest.fn(),
        updateProviderPayment: jest.fn(),
        expirePendingByTxid: jest.fn(),
        updateStatus: jest.fn(),
        confirmAndCreditHost: jest.fn(),
        releaseHostCredit: jest.fn(),
        applyRefund: jest.fn(),
    };
}

describe('registration payment approval policy', () => {
    it('releases host credit when the host approves an already paid registration', async () => {
        const registrations = registrationRepository();
        const payments = paymentRepository({
            id: 'payment-1',
            status: PaymentStatus.CONFIRMED,
        });
        const notifications = { execute: jest.fn() };
        const useCase = new ApproveRegistrationUseCase(registrations as any, notifications as any, payments as any);

        await useCase.execute('booking-1', 'host-1');

        expect(registrations.updateStatus).toHaveBeenCalledWith('booking-1', 'APPROVED', undefined, 'host-1');
        expect(payments.releaseHostCredit).toHaveBeenCalledWith({ paymentId: 'payment-1', hostId: 'host-1' });
    });

    it('keeps host credit locked when approval happens before payment confirmation', async () => {
        const registrations = registrationRepository();
        const payments = paymentRepository({
            id: 'payment-1',
            status: PaymentStatus.PENDING,
        });
        const useCase = new ApproveRegistrationUseCase(registrations as any, { execute: jest.fn() } as any, payments as any);

        await useCase.execute('booking-1', 'host-1');

        expect(payments.releaseHostCredit).not.toHaveBeenCalled();
    });

    it('requests an Asaas refund before rejecting an already paid registration', async () => {
        const registrations = registrationRepository();
        registrations.updateStatus.mockResolvedValue({ ...registration, status: 'REJECTED' });
        const payments = paymentRepository({
            id: 'payment-1',
            providerPaymentId: 'pay-1',
            status: PaymentStatus.CONFIRMED,
            valor: 100,
        });
        const gateway = {
            refundPayment: jest.fn().mockResolvedValue({ id: 'pay-1', status: 'REFUND_REQUESTED' }),
            deletePayment: jest.fn(),
            cancelCheckout: jest.fn(),
        };
        const useCase = new RejectRegistrationUseCase(
            registrations as any,
            { execute: jest.fn() } as any,
            payments as any,
            gateway as any
        );

        await useCase.execute('booking-1', 'host-1', 'Sem vaga');

        expect(gateway.refundPayment).toHaveBeenCalledWith('pay-1', 100, 'Sem vaga');
        expect(registrations.updateStatus).toHaveBeenCalledWith('booking-1', 'REJECTED', 'Sem vaga', 'host-1');
    });
});
