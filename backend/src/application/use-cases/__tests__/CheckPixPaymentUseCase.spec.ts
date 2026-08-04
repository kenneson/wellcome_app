import { CheckPixPaymentUseCase } from '../CheckPixPaymentUseCase';
import { EventRepository } from '../../../domain/repositories/EventRepository';
import { PaymentRepository } from '../../../domain/repositories/PaymentRepository';
import { Payment } from '../../../domain/entities/Payment';
import { PaymentStatus } from '../../../domain/value-objects/PaymentStatus';

describe('CheckPixPaymentUseCase', () => {
    const payment: Payment = {
        id: 'payment-1',
        bookingId: 'booking-1',
        eventId: 'event-1',
        userId: 'guest-1',
        txid: 'txid-1',
        pixCopiaECola: 'pix-copy-paste',
        qrcode: 'qrcode',
        valor: 100,
        status: PaymentStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    let paymentRepository: jest.Mocked<PaymentRepository>;
    let eventRepository: jest.Mocked<EventRepository>;
    let efiPixService: { getChargeStatus: jest.Mock };
    let sendNotificationUseCase: { execute: jest.Mock };
    let useCase: CheckPixPaymentUseCase;

    beforeEach(() => {
        paymentRepository = {
            create: jest.fn(),
            findByBookingId: jest.fn(),
            findByTxid: jest.fn(),
            findByProviderPaymentId: jest.fn(),
            claimCheckoutCreation: jest.fn(),
            saveCheckout: jest.fn(),
            markCheckoutCreationFailed: jest.fn(),
            updateProviderPayment: jest.fn(),
            expirePendingByTxid: jest.fn(),
            updateStatus: jest.fn(),
            confirmAndCreditHost: jest.fn(),
            applyRefund: jest.fn(),
        };
        eventRepository = {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        };
        efiPixService = { getChargeStatus: jest.fn() };
        sendNotificationUseCase = { execute: jest.fn() };
        useCase = new CheckPixPaymentUseCase(
            efiPixService as any,
            paymentRepository,
            eventRepository,
            sendNotificationUseCase as any
        );
    });

    it('rejects a payment status check from another user', async () => {
        paymentRepository.findByBookingId.mockResolvedValue(payment);

        await expect(useCase.execute(payment.bookingId, 'guest-2'))
            .rejects.toThrow('Payment does not belong to this user');

        expect(efiPixService.getChargeStatus).not.toHaveBeenCalled();
        expect(paymentRepository.confirmAndCreditHost).not.toHaveBeenCalled();
    });

    it('confirms and credits the host through the single transactional operation', async () => {
        paymentRepository.findByBookingId.mockResolvedValue(payment);
        efiPixService.getChargeStatus.mockResolvedValue({ status: 'CONCLUIDA', txid: payment.txid });
        eventRepository.findById.mockResolvedValue({
            id: payment.eventId,
            title: 'Jantar de teste',
            hostId: 'host-1',
            host: { id: 'host-1', expoPushToken: null },
        } as any);
        paymentRepository.confirmAndCreditHost.mockResolvedValue(true);

        const result = await useCase.execute(payment.bookingId, payment.userId);

        expect(result).toEqual({
            paymentId: payment.id,
            txid: payment.txid,
            status: PaymentStatus.CONFIRMED,
            paid: true,
        });
        expect(paymentRepository.confirmAndCreditHost).toHaveBeenCalledWith(expect.objectContaining({
            paymentId: payment.id,
            bookingId: payment.bookingId,
            hostId: 'host-1',
            platformFee: 10,
            netAmount: 90,
        }));
        expect(sendNotificationUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('does not notify or credit twice when another worker already confirmed the payment', async () => {
        paymentRepository.findByTxid.mockResolvedValue(payment);
        efiPixService.getChargeStatus.mockResolvedValue({ status: 'CONCLUIDA', txid: payment.txid });
        eventRepository.findById.mockResolvedValue({
            id: payment.eventId,
            title: 'Jantar de teste',
            hostId: 'host-1',
            host: { id: 'host-1', expoPushToken: null },
        } as any);
        paymentRepository.confirmAndCreditHost.mockResolvedValue(false);

        const result = await useCase.executeByTxid(payment.txid);

        expect(result.paid).toBe(true);
        expect(paymentRepository.confirmAndCreditHost).toHaveBeenCalledTimes(1);
        expect(sendNotificationUseCase.execute).not.toHaveBeenCalled();
    });
});
