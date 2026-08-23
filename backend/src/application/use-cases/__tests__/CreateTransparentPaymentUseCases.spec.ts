import { Payment } from '../../../domain/entities/Payment';
import { PaymentGatewayError } from '../../../domain/services/PaymentGateway';
import { PaymentStatus } from '../../../domain/value-objects/PaymentStatus';
import { CreatePixPaymentUseCase, PayWithSavedCardUseCase } from '../CreateTransparentPaymentUseCases';

describe('Transparent payment use cases', () => {
    const payment: Payment = {
        id: 'payment-1',
        bookingId: 'booking-1',
        eventId: 'event-1',
        userId: 'user-1',
        txid: 'pay-1',
        pixCopiaECola: '',
        qrcode: '',
        provider: 'ASAAS',
        providerPaymentId: 'pay-1',
        providerStatus: 'PENDING',
        valor: 100,
        status: PaymentStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    const eventRepository = { findById: jest.fn() };
    const registrationRepository = { findById: jest.fn() };
    const paymentRepository = {
        findByBookingId: jest.fn(),
        findByProviderPaymentId: jest.fn(),
        create: jest.fn(),
        resetForProviderPayment: jest.fn(),
        claimProviderPaymentCreation: jest.fn(),
        saveProviderPayment: jest.fn(),
        savePixData: jest.fn(),
        claimCardPaymentAttempt: jest.fn(),
        markCheckoutCreationFailed: jest.fn(),
        updateProviderPayment: jest.fn(),
        confirmAndHoldHostFunds: jest.fn(),
    };
    const billingRepository = {
        findProfileByUserId: jest.fn(),
        setAsaasCustomerId: jest.fn(),
        findCardById: jest.fn(),
    };
    const paymentGateway = {
        findCustomerByExternalReference: jest.fn(),
        createCustomer: jest.fn(),
        updateCustomer: jest.fn(),
        getPayment: jest.fn(),
        createPayment: jest.fn(),
        getPixQrCode: jest.fn(),
        payWithCreditCard: jest.fn(),
        listCheckoutPayments: jest.fn(),
        cancelCheckout: jest.fn(),
        deletePayment: jest.fn(),
    };
    const notifications = { execute: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.ASAAS_BASE_URL = 'https://api-sandbox.asaas.com/v3';
        process.env.APP_FEE_PERCENTAGE = '10';
        eventRepository.findById.mockResolvedValue({
            id: 'event-1',
            title: 'Evento teste',
            price: 100,
            hostId: 'host-1',
            host: { id: 'host-1', expoPushToken: null },
        });
        registrationRepository.findById.mockResolvedValue({
            id: 'booking-1',
            eventId: 'event-1',
            userId: 'user-1',
        });
        billingRepository.findProfileByUserId.mockResolvedValue({
            id: 'billing-1',
            userId: 'user-1',
            asaasCustomerId: 'cus-1',
            fullName: 'Maria da Silva',
            cpfCnpj: '52998224725',
            email: 'maria@example.com',
            mobilePhone: '11999999999',
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        billingRepository.findCardById.mockResolvedValue({
            id: 'card-1',
            userId: 'user-1',
            billingProfileId: 'billing-1',
            provider: 'ASAAS',
            providerToken: 'tok-1',
            brand: 'VISA',
            lastFour: '4444',
            holderName: 'MARIA DA SILVA',
            expiryMonth: 12,
            expiryYear: 2030,
            isDefault: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        paymentRepository.findByBookingId.mockResolvedValue(payment);
        paymentGateway.getPayment.mockResolvedValue({
            id: 'pay-1',
            billingType: 'UNDEFINED',
            status: 'PENDING',
            value: 100,
            netValue: 100,
        });
        paymentGateway.getPixQrCode.mockResolvedValue({
            payload: '00020101021226890014br.gov.bcb.pix',
            expirationDate: '2026-08-05T12:00:00.000Z',
        });
        paymentGateway.updateCustomer.mockResolvedValue({ id: 'cus-1' });
        paymentRepository.savePixData.mockResolvedValue(payment);
        paymentRepository.updateProviderPayment.mockResolvedValue(payment);
        paymentRepository.confirmAndHoldHostFunds.mockResolvedValue(true);
        paymentRepository.claimCardPaymentAttempt.mockResolvedValue(true);
        paymentGateway.payWithCreditCard.mockReset().mockResolvedValue({
            id: 'pay-1',
            billingType: 'CREDIT_CARD',
            status: 'CONFIRMED',
            value: 100,
            netValue: 97.5,
        });
    });

    it('reuses one provider charge when generating Pix', async () => {
        const useCase = new CreatePixPaymentUseCase(
            paymentGateway as any,
            eventRepository as any,
            registrationRepository as any,
            paymentRepository as any,
            billingRepository as any,
            notifications as any
        );

        const result = await useCase.execute({
            bookingId: 'booking-1', eventId: 'event-1', userId: 'user-1',
        });

        expect(paymentGateway.createPayment).not.toHaveBeenCalled();
        expect(paymentGateway.updateCustomer).toHaveBeenCalledWith(
            'cus-1',
            expect.objectContaining({ externalReference: 'user-1' })
        );
        expect(paymentGateway.getPixQrCode).toHaveBeenCalledWith('pay-1');
        expect(paymentRepository.savePixData).toHaveBeenCalledWith(expect.objectContaining({
            paymentId: 'payment-1',
            payload: expect.stringContaining('br.gov.bcb.pix'),
        }));
        expect(result).toEqual(expect.objectContaining({ paid: false, environment: 'sandbox' }));
    });

    it('blocks Pix before approval without synchronizing or creating an Asaas customer', async () => {
        eventRepository.findById.mockResolvedValue({
            id: 'event-1',
            title: 'Evento moderado',
            price: 100,
            hostId: 'host-1',
            accessType: 'OPEN_WITH_APPROVAL',
            requiresApproval: true,
        });
        registrationRepository.findById.mockResolvedValue({
            id: 'booking-1',
            eventId: 'event-1',
            userId: 'user-1',
            status: 'PENDING',
        });
        const useCase = new CreatePixPaymentUseCase(
            paymentGateway as any,
            eventRepository as any,
            registrationRepository as any,
            paymentRepository as any,
            billingRepository as any,
            notifications as any
        );

        await expect(useCase.execute({
            bookingId: 'booking-1', eventId: 'event-1', userId: 'user-1',
        })).rejects.toThrow('Registration must be approved before payment');

        expect(billingRepository.findProfileByUserId).not.toHaveBeenCalled();
        expect(paymentGateway.createCustomer).not.toHaveBeenCalled();
        expect(paymentGateway.createPayment).not.toHaveBeenCalled();
    });

    it('shows Pix as awaiting settlement during a cautionary confirmation', async () => {
        paymentGateway.getPayment.mockResolvedValue({
            id: 'pay-1',
            billingType: 'PIX',
            status: 'CONFIRMED',
            value: 100,
            netValue: 98,
        });
        const useCase = new CreatePixPaymentUseCase(
            paymentGateway as any,
            eventRepository as any,
            registrationRepository as any,
            paymentRepository as any,
            billingRepository as any,
            notifications as any
        );

        const result = await useCase.execute({
            bookingId: 'booking-1', eventId: 'event-1', userId: 'user-1',
        });

        expect(result).toEqual(expect.objectContaining({
            paid: false,
            awaitingSettlement: true,
            status: 'CONFIRMED',
        }));
        expect(paymentGateway.getPixQrCode).not.toHaveBeenCalled();
        expect(paymentRepository.confirmAndHoldHostFunds).not.toHaveBeenCalled();
    });

    it('does not request another Pix QR when the provider charge is already paid', async () => {
        paymentGateway.getPayment.mockResolvedValue({
            id: 'pay-1',
            billingType: 'CREDIT_CARD',
            status: 'CONFIRMED',
            value: 100,
            netValue: 97.5,
        });
        const useCase = new CreatePixPaymentUseCase(
            paymentGateway as any,
            eventRepository as any,
            registrationRepository as any,
            paymentRepository as any,
            billingRepository as any,
            notifications as any
        );

        const result = await useCase.execute({
            bookingId: 'booking-1', eventId: 'event-1', userId: 'user-1',
        });

        expect(result).toEqual(expect.objectContaining({ paid: false, awaitingSettlement: true }));
        expect(paymentGateway.getPixQrCode).not.toHaveBeenCalled();
        expect(paymentRepository.confirmAndHoldHostFunds).not.toHaveBeenCalled();
    });

    it('records a definitive card refusal and does not approve the booking', async () => {
        paymentGateway.payWithCreditCard.mockRejectedValue(
            new PaymentGatewayError('Transacao nao autorizada', 400, 'invalid_creditCard')
        );
        const useCase = new PayWithSavedCardUseCase(
            paymentGateway as any,
            eventRepository as any,
            registrationRepository as any,
            paymentRepository as any,
            billingRepository as any,
            notifications as any
        );

        await expect(useCase.execute({
            bookingId: 'booking-1', eventId: 'event-1', userId: 'user-1', cardId: 'card-1',
        })).rejects.toThrow('Transacao nao autorizada');

        expect(paymentGateway.payWithCreditCard).toHaveBeenCalledWith('pay-1', 'tok-1');
        expect(paymentRepository.claimCardPaymentAttempt).toHaveBeenCalledWith('payment-1', 'pay-1');
        expect(paymentRepository.updateProviderPayment).toHaveBeenCalledWith({
            paymentId: 'payment-1',
            providerPaymentId: 'pay-1',
            paymentMethod: 'CREDIT_CARD',
            providerStatus: 'invalid_creditCard',
        });
        expect(paymentRepository.confirmAndHoldHostFunds).not.toHaveBeenCalled();
    });

    it('blocks a concurrent card capture attempt', async () => {
        paymentRepository.claimCardPaymentAttempt.mockResolvedValue(false);
        const useCase = new PayWithSavedCardUseCase(
            paymentGateway as any,
            eventRepository as any,
            registrationRepository as any,
            paymentRepository as any,
            billingRepository as any,
            notifications as any
        );

        await expect(useCase.execute({
            bookingId: 'booking-1', eventId: 'event-1', userId: 'user-1', cardId: 'card-1',
        })).rejects.toThrow('Payment is being processed');

        expect(paymentGateway.payWithCreditCard).not.toHaveBeenCalled();
    });

    it('does not capture again when the provider already confirms the charge', async () => {
        paymentGateway.getPayment.mockResolvedValue({
            id: 'pay-1',
            billingType: 'CREDIT_CARD',
            status: 'CONFIRMED',
            value: 100,
            netValue: 97.5,
        });
        const useCase = new PayWithSavedCardUseCase(
            paymentGateway as any,
            eventRepository as any,
            registrationRepository as any,
            paymentRepository as any,
            billingRepository as any,
            notifications as any
        );

        const result = await useCase.execute({
            bookingId: 'booking-1', eventId: 'event-1', userId: 'user-1', cardId: 'card-1',
        });

        expect(result).toEqual(expect.objectContaining({ paid: false, awaitingSettlement: true }));
        expect(paymentGateway.payWithCreditCard).not.toHaveBeenCalled();
        expect(paymentRepository.claimCardPaymentAttempt).not.toHaveBeenCalled();
        expect(paymentRepository.confirmAndHoldHostFunds).not.toHaveBeenCalled();
    });
});
