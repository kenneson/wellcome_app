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
        expect(paymentRepository.claimCheckoutCreation).toHaveBeenCalledWith('payment-1', 120);
        expect(result.checkoutId).toBe('checkout-1');
    });

    it('refreshes the stored amount when retrying a failed checkout', async () => {
        paymentRepository.findByBookingId.mockResolvedValue({
            ...payment,
            valor: 2,
            providerStatus: 'FAILED',
        });

        await useCase.execute({
            bookingId: 'booking-1',
            eventId: 'event-1',
            userId: 'user-1',
        });

        expect(paymentRepository.claimCheckoutCreation).toHaveBeenCalledWith('payment-1', 120);
        expect(paymentGateway.createCheckout).toHaveBeenCalledWith(expect.objectContaining({
            value: 120,
        }));
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
        })).rejects.toThrow('Eventos pagos devem custar entre R$ 5,00 e R$ 100.000,00, ou ser gratuitos');

        expect(registrationRepository.findById).not.toHaveBeenCalled();
        expect(paymentGateway.createCheckout).not.toHaveBeenCalled();
    });

    it('creates a checkout before host approval in a moderated event', async () => {
        eventRepository.findById.mockResolvedValue({
            id: 'event-1',
            title: 'Jantar moderado',
            price: 120,
            accessType: 'OPEN_WITH_APPROVAL',
            requiresApproval: true,
        });
        registrationRepository.findById.mockResolvedValue({
            id: 'booking-1',
            eventId: 'event-1',
            userId: 'user-1',
            status: 'PENDING',
        });

        await expect(useCase.execute({
            bookingId: 'booking-1',
            eventId: 'event-1',
            userId: 'user-1',
        })).resolves.toEqual(expect.objectContaining({ status: 'PENDING' }));

        expect(paymentRepository.findByBookingId).toHaveBeenCalled();
        expect(paymentGateway.createCheckout).toHaveBeenCalledTimes(1);
    });

    it('does not create a checkout after the approval payment window expires', async () => {
        eventRepository.findById.mockResolvedValue({
            id: 'event-1',
            title: 'Jantar moderado',
            price: 120,
            accessType: 'OPEN_WITH_APPROVAL',
            requiresApproval: true,
        });
        registrationRepository.findById.mockResolvedValue({
            id: 'booking-1',
            eventId: 'event-1',
            userId: 'user-1',
            status: 'APPROVED',
            paymentDueAt: new Date(Date.now() - 1000),
        });

        await expect(useCase.execute({
            bookingId: 'booking-1',
            eventId: 'event-1',
            userId: 'user-1',
        })).rejects.toThrow('Registration payment window expired');

        expect(paymentGateway.createCheckout).not.toHaveBeenCalled();
    });
});
