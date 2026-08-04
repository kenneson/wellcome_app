import { Payment } from '../../../domain/entities/Payment';
import { PaymentStatus } from '../../../domain/value-objects/PaymentStatus';
import { CreatePaymentCheckoutUseCase } from '../CreatePaymentCheckoutUseCase';

describe('CreatePaymentCheckoutUseCase', () => {
    const payment: Payment = {
        id: 'payment-1',
        bookingId: 'booking-1',
        eventId: 'event-1',
        userId: 'user-1',
        txid: 'asaas-pending-1',
        pixCopiaECola: '',
        qrcode: '',
        provider: 'ASAAS',
        valor: 120,
        status: PaymentStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const eventRepository = {
        findById: jest.fn(),
    };
    const registrationRepository = {
        findById: jest.fn(),
    };
    const paymentRepository = {
        findByBookingId: jest.fn(),
        create: jest.fn(),
        claimCheckoutCreation: jest.fn(),
        saveCheckout: jest.fn(),
        markCheckoutCreationFailed: jest.fn(),
    };
    const paymentGateway = {
        createCheckout: jest.fn(),
        listCheckoutPayments: jest.fn(),
    };

    let useCase: CreatePaymentCheckoutUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.PUBLIC_API_URL = 'https://api.wellcome.test';
        eventRepository.findById.mockResolvedValue({
            id: 'event-1',
            title: 'Jantar de teste',
            price: 120,
        });
        registrationRepository.findById.mockResolvedValue({
            id: 'booking-1',
            eventId: 'event-1',
            userId: 'user-1',
        });
        paymentRepository.findByBookingId.mockResolvedValue(null);
        paymentRepository.create.mockResolvedValue(payment);
        paymentRepository.claimCheckoutCreation.mockResolvedValue(true);
        paymentGateway.createCheckout.mockResolvedValue({
            id: 'checkout-1',
            link: 'https://sandbox.asaas.com/checkoutSession/show/checkout-1',
            status: 'ACTIVE',
        });
        paymentRepository.saveCheckout.mockResolvedValue({
            ...payment,
            txid: 'checkout-1',
            checkoutUrl: 'https://sandbox.asaas.com/checkoutSession/show/checkout-1',
            providerStatus: 'ACTIVE',
        });

        useCase = new CreatePaymentCheckoutUseCase(
            paymentGateway as any,
            eventRepository as any,
            registrationRepository as any,
            paymentRepository as any
        );
    });

    it('creates a hosted checkout with Pix and card provider data', async () => {
        const result = await useCase.execute({
            bookingId: 'booking-1',
            eventId: 'event-1',
            userId: 'user-1',
        });

        expect(paymentGateway.createCheckout).toHaveBeenCalledWith(expect.objectContaining({
            externalReference: 'booking-1',
            value: 120,
            callbackBaseUrl: 'https://api.wellcome.test',
        }));
        expect(paymentRepository.saveCheckout).toHaveBeenCalledWith({
            paymentId: 'payment-1',
            checkoutId: 'checkout-1',
            checkoutUrl: 'https://sandbox.asaas.com/checkoutSession/show/checkout-1',
            providerStatus: 'ACTIVE',
        });
        expect(result.checkoutId).toBe('checkout-1');
    });

    it('returns the existing active checkout without creating another one', async () => {
        paymentRepository.findByBookingId.mockResolvedValue({
            ...payment,
            txid: 'checkout-existing',
            checkoutUrl: 'https://sandbox.asaas.com/checkoutSession/show/checkout-existing',
        });

        const result = await useCase.execute({
            bookingId: 'booking-1',
            eventId: 'event-1',
            userId: 'user-1',
        });

        expect(result.checkoutId).toBe('checkout-existing');
        expect(paymentGateway.createCheckout).not.toHaveBeenCalled();
    });

    it('rejects checkout for an event below the payment provider minimum', async () => {
        eventRepository.findById.mockResolvedValue({
            id: 'event-1',
            title: 'Evento abaixo do minimo',
            price: 2,
        });

        await expect(useCase.execute({
            bookingId: 'booking-1',
            eventId: 'event-1',
            userId: 'user-1',
        })).rejects.toThrow('Eventos pagos devem custar no minimo R$ 5,00 ou ser gratuitos');

        expect(registrationRepository.findById).not.toHaveBeenCalled();
        expect(paymentGateway.createCheckout).not.toHaveBeenCalled();
    });
});
