import { PaymentStatus } from '../../../domain/value-objects/PaymentStatus';
import { HandleAsaasWebhookUseCase } from '../HandleAsaasWebhookUseCase';

describe('HandleAsaasWebhookUseCase', () => {
    const paymentRepository = {
        findByTxid: jest.fn(),
        updateProviderPayment: jest.fn(),
        confirmAndCreditHost: jest.fn(),
        expirePendingByTxid: jest.fn(),
        findByProviderPaymentId: jest.fn(),
        applyRefund: jest.fn(),
    };
    const eventRepository = {
        findById: jest.fn(),
    };
    const withdrawalRepository = {
        completeByProviderTransferId: jest.fn(),
        failAndRefundByProviderTransferId: jest.fn(),
        recordProviderProcessing: jest.fn(),
    };
    const webhookRepository = {
        startProcessing: jest.fn(),
        markProcessed: jest.fn(),
        markFailed: jest.fn(),
    };
    const paymentGateway = {
        createCheckout: jest.fn(),
        listCheckoutPayments: jest.fn(),
        getPayment: jest.fn(),
    };
    const notifications = { execute: jest.fn() };

    let useCase: HandleAsaasWebhookUseCase;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.APP_FEE_PERCENTAGE = '10';
        process.env.PAYMENT_PROCESSING_FEE_PAYER = 'PLATFORM';
        webhookRepository.startProcessing.mockResolvedValue(true);
        webhookRepository.markProcessed.mockResolvedValue(undefined);
        paymentRepository.findByTxid.mockResolvedValue({
            id: 'payment-1',
            bookingId: 'booking-1',
            eventId: 'event-1',
            userId: 'user-1',
            txid: 'checkout-1',
            pixCopiaECola: '',
            qrcode: '',
            provider: 'ASAAS',
            valor: 100,
            status: PaymentStatus.PENDING,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        paymentGateway.listCheckoutPayments.mockResolvedValue([{
            id: 'pay-1',
            billingType: 'PIX',
            status: 'RECEIVED',
            value: 100,
            netValue: 98.01,
            externalReference: 'booking-1',
        }]);
        paymentGateway.getPayment.mockResolvedValue({
            id: 'pay-1',
            billingType: 'PIX',
            status: 'RECEIVED',
            value: 100,
            netValue: 98.01,
            externalReference: 'booking-1',
        });
        paymentRepository.findByProviderPaymentId.mockResolvedValue({
            id: 'payment-1',
            bookingId: 'booking-1',
            eventId: 'event-1',
            userId: 'user-1',
            txid: 'pay-1',
            pixCopiaECola: '',
            qrcode: '',
            provider: 'ASAAS',
            providerPaymentId: 'pay-1',
            valor: 100,
            status: PaymentStatus.PENDING,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        paymentRepository.updateProviderPayment.mockResolvedValue({});
        paymentRepository.confirmAndCreditHost.mockResolvedValue(true);
        eventRepository.findById.mockResolvedValue({
            id: 'event-1',
            title: 'Jantar de teste',
            hostId: 'host-1',
            host: { id: 'host-1', expoPushToken: null },
            accessType: 'OPEN',
            requiresApproval: false,
        });

        useCase = new HandleAsaasWebhookUseCase(
            paymentGateway as any,
            paymentRepository as any,
            eventRepository as any,
            withdrawalRepository as any,
            webhookRepository as any,
            notifications as any
        );
    });

    it('confirms the checkout and credits the host once', async () => {
        const result = await useCase.execute({
            id: 'evt-1',
            event: 'CHECKOUT_PAID',
            checkout: { id: 'checkout-1', status: 'PAID' },
        });

        expect(result).toEqual({ duplicate: false, action: 'payment_confirmed' });
        expect(paymentRepository.confirmAndCreditHost).toHaveBeenCalledWith(expect.objectContaining({
            paymentId: 'payment-1',
            bookingId: 'booking-1',
            hostId: 'host-1',
            platformFee: 10,
            processorFee: 1.99,
            netAmount: 90,
            approveBookingOnPayment: true,
        }));
        expect(notifications.execute).toHaveBeenCalledTimes(1);
        expect(webhookRepository.markProcessed).toHaveBeenCalledWith('evt-1');
    });

    it('ignores an already processed webhook event', async () => {
        webhookRepository.startProcessing.mockResolvedValue(false);

        const result = await useCase.execute({
            id: 'evt-1',
            event: 'CHECKOUT_PAID',
            checkout: { id: 'checkout-1', status: 'PAID' },
        });

        expect(result).toEqual({ duplicate: true, action: 'ignored' });
        expect(paymentGateway.listCheckoutPayments).not.toHaveBeenCalled();
        expect(paymentRepository.confirmAndCreditHost).not.toHaveBeenCalled();
    });

    it('confirms a direct Pix payment from the authoritative provider response', async () => {
        const result = await useCase.execute({
            id: 'evt-pix-1',
            event: 'PAYMENT_RECEIVED',
            payment: { id: 'pay-1', status: 'RECEIVED', value: 100 },
        });

        expect(result).toEqual({ duplicate: false, action: 'payment_confirmed' });
        expect(paymentGateway.getPayment).toHaveBeenCalledWith('pay-1');
        expect(paymentRepository.confirmAndCreditHost).toHaveBeenCalledTimes(1);
        expect(webhookRepository.markProcessed).toHaveBeenCalledWith('evt-pix-1');
    });

    it('rejects a direct payment when the provider amount diverges', async () => {
        paymentGateway.getPayment.mockResolvedValue({
            id: 'pay-1',
            billingType: 'PIX',
            status: 'RECEIVED',
            value: 80,
            netValue: 78.01,
        });

        await expect(useCase.execute({
            id: 'evt-pix-divergent',
            event: 'PAYMENT_RECEIVED',
            payment: { id: 'pay-1', status: 'RECEIVED', value: 80 },
        })).rejects.toThrow('Valor divergente');

        expect(paymentRepository.confirmAndCreditHost).not.toHaveBeenCalled();
        expect(webhookRepository.markFailed).toHaveBeenCalledWith(
            'evt-pix-divergent',
            expect.stringContaining('Valor divergente')
        );
    });

    it('waits for Pix settlement instead of crediting on a cautionary confirmation', async () => {
        paymentGateway.getPayment.mockResolvedValue({
            id: 'pay-1',
            billingType: 'PIX',
            status: 'CONFIRMED',
            value: 100,
            netValue: 98.01,
        });

        const result = await useCase.execute({
            id: 'evt-pix-confirmed',
            event: 'PAYMENT_CONFIRMED',
            payment: { id: 'pay-1', status: 'CONFIRMED', value: 100 },
        });

        expect(result).toEqual({ duplicate: false, action: 'payment_awaiting_settlement' });
        expect(paymentRepository.updateProviderPayment).toHaveBeenCalledWith({
            paymentId: 'payment-1',
            providerPaymentId: 'pay-1',
            paymentMethod: 'PIX',
            providerStatus: 'CONFIRMED',
        });
        expect(paymentRepository.confirmAndCreditHost).not.toHaveBeenCalled();
    });

    it('records a refused card without approving the booking', async () => {
        const result = await useCase.execute({
            id: 'evt-card-refused',
            event: 'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED',
            payment: {
                id: 'pay-1',
                status: 'CREDIT_CARD_CAPTURE_REFUSED',
                billingType: 'CREDIT_CARD',
            },
        });

        expect(result).toEqual({ duplicate: false, action: 'payment_refused' });
        expect(paymentRepository.updateProviderPayment).toHaveBeenCalledWith({
            paymentId: 'payment-1',
            providerPaymentId: 'pay-1',
            paymentMethod: 'CREDIT_CARD',
            providerStatus: 'CREDIT_CARD_CAPTURE_REFUSED',
        });
        expect(paymentRepository.confirmAndCreditHost).not.toHaveBeenCalled();
    });

    it('links an early transfer webhook using externalReference', async () => {
        const result = await useCase.execute({
            id: 'evt-transfer-done',
            event: 'TRANSFER_DONE',
            transfer: {
                id: 'transfer-1',
                status: 'DONE',
                externalReference: '550e8400-e29b-41d4-a716-446655440000',
                endToEndIdentifier: 'e2e-1',
            },
        });

        expect(result).toEqual({ duplicate: false, action: 'transfer_completed' });
        expect(withdrawalRepository.completeByProviderTransferId).toHaveBeenCalledWith(
            'transfer-1',
            'e2e-1',
            '550e8400-e29b-41d4-a716-446655440000'
        );
    });

    it('records transfer processing events without releasing or refunding balance', async () => {
        const result = await useCase.execute({
            id: 'evt-transfer-pending',
            event: 'TRANSFER_PENDING',
            transfer: {
                id: 'transfer-1',
                status: 'PENDING',
                externalReference: '550e8400-e29b-41d4-a716-446655440000',
            },
        });

        expect(result).toEqual({ duplicate: false, action: 'transfer_processing' });
        expect(withdrawalRepository.recordProviderProcessing).toHaveBeenCalledWith({
            providerTransferId: 'transfer-1',
            externalReference: '550e8400-e29b-41d4-a716-446655440000',
            providerStatus: 'PENDING',
            providerEndToEndId: undefined,
        });
        expect(withdrawalRepository.failAndRefundByProviderTransferId).not.toHaveBeenCalled();
    });
});
