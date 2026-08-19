import { PaymentStatus } from '../../../domain/value-objects/PaymentStatus';
import { CheckPaymentUseCase } from '../CheckPaymentUseCase';

describe('CheckPaymentUseCase', () => {
    const basePayment = {
        id: 'payment-1',
        bookingId: 'booking-1',
        eventId: 'event-1',
        userId: 'user-1',
        txid: 'checkout-1',
        checkoutUrl: 'https://checkout.asaas.com/c/checkout-1',
        pixCopiaECola: '',
        qrcode: '',
        provider: 'ASAAS',
        valor: 100,
        status: PaymentStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const paymentRepository = {
        findByBookingId: jest.fn(),
        updateProviderPayment: jest.fn(),
        confirmAndCreditHost: jest.fn(),
    };
    const paymentGateway = {
        listCheckoutPayments: jest.fn(),
        getPayment: jest.fn(),
    };
    const eventRepository = {
        findById: jest.fn(),
    };
    const notifications = { execute: jest.fn() };

    let useCase: CheckPaymentUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.APP_FEE_PERCENTAGE = '10';
        process.env.PAYMENT_PROCESSING_FEE_PAYER = 'PLATFORM';
        paymentRepository.findByBookingId.mockResolvedValue(basePayment);
        paymentRepository.updateProviderPayment.mockResolvedValue({
            ...basePayment,
            providerPaymentId: 'pay-1',
            providerStatus: 'RECEIVED',
            paymentMethod: 'PIX',
        });
        paymentRepository.confirmAndCreditHost.mockResolvedValue(true);
        paymentGateway.listCheckoutPayments.mockResolvedValue([{
            id: 'pay-1',
            billingType: 'PIX',
            status: 'RECEIVED',
            value: 100,
            netValue: 98,
            paymentDate: '2026-08-18',
            externalReference: 'booking-1',
        }]);
        eventRepository.findById.mockResolvedValue({
            id: 'event-1',
            title: 'Jantar de teste',
            hostId: 'host-1',
            host: { id: 'host-1', expoPushToken: null },
            accessType: 'OPEN',
            requiresApproval: false,
        });
        useCase = new CheckPaymentUseCase(
            paymentRepository as any,
            paymentGateway as any,
            eventRepository as any,
            notifications as any
        );
    });

    it('reconciles a pending Asaas checkout when the provider payment is settled', async () => {
        const result = await useCase.execute('booking-1', 'user-1');

        expect(paymentGateway.listCheckoutPayments).toHaveBeenCalledWith('checkout-1');
        expect(paymentRepository.updateProviderPayment).toHaveBeenCalledWith({
            paymentId: 'payment-1',
            providerPaymentId: 'pay-1',
            paymentMethod: 'PIX',
            providerStatus: 'RECEIVED',
        });
        expect(paymentRepository.confirmAndCreditHost).toHaveBeenCalledWith(expect.objectContaining({
            paymentId: 'payment-1',
            bookingId: 'booking-1',
            hostId: 'host-1',
            platformFee: 10,
            netAmount: 90,
            approveBookingOnPayment: true,
        }));
        expect(result).toEqual(expect.objectContaining({
            status: PaymentStatus.CONFIRMED,
            providerStatus: 'RECEIVED',
            paymentMethod: 'PIX',
            paid: true,
        }));
    });

    it('keeps the local status pending when Asaas has not settled the payment yet', async () => {
        paymentGateway.listCheckoutPayments.mockResolvedValueOnce([{
            id: 'pay-1',
            billingType: 'PIX',
            status: 'CONFIRMED',
            value: 100,
            netValue: 98,
            externalReference: 'booking-1',
        }]);
        paymentRepository.updateProviderPayment.mockResolvedValueOnce({
            ...basePayment,
            providerPaymentId: 'pay-1',
            providerStatus: 'CONFIRMED',
            paymentMethod: 'PIX',
        });

        const result = await useCase.execute('booking-1', 'user-1');

        expect(paymentRepository.confirmAndCreditHost).not.toHaveBeenCalled();
        expect(result).toEqual(expect.objectContaining({
            status: PaymentStatus.PENDING,
            providerStatus: 'CONFIRMED',
            paid: false,
        }));
    });

    it('falls back to the local status if Asaas reconciliation fails', async () => {
        paymentGateway.listCheckoutPayments.mockRejectedValueOnce(new Error('Asaas unavailable'));

        const result = await useCase.execute('booking-1', 'user-1');

        expect(result).toEqual(expect.objectContaining({
            status: PaymentStatus.PENDING,
            paid: false,
        }));
    });
});