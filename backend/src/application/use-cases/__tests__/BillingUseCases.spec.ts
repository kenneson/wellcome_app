import { AddPaymentCardUseCase } from '../AddPaymentCardUseCase';
import { GetBillingWalletUseCase } from '../GetBillingWalletUseCase';
import { SaveBillingProfileUseCase } from '../SaveBillingProfileUseCase';

describe('Billing use cases', () => {
    const now = new Date('2026-08-04T12:00:00.000Z');
    const profile = {
        id: 'profile-billing-1',
        userId: 'user-1',
        fullName: 'Maria da Silva',
        cpfCnpj: '52998224725',
        email: 'maria@example.com',
        mobilePhone: '11999999999',
        postalCode: '01310100',
        addressNumber: '100',
        addressComplement: 'Apto 12',
        createdAt: now,
        updatedAt: now,
    };

    const billingRepository = {
        findProfileByUserId: jest.fn(),
        saveProfile: jest.fn(),
        setAsaasCustomerId: jest.fn(),
        listCards: jest.fn(),
        findCardById: jest.fn(),
        saveCard: jest.fn(),
        deleteCard: jest.fn(),
        setDefaultCard: jest.fn(),
    };
    const paymentGateway = {
        findCustomerByExternalReference: jest.fn(),
        createCustomer: jest.fn(),
        updateCustomer: jest.fn(),
        tokenizeCreditCard: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.ASAAS_BASE_URL = 'https://api-sandbox.asaas.com/v3';
        billingRepository.findProfileByUserId.mockResolvedValue({
            ...profile,
            asaasCustomerId: 'cus-1',
        });
        billingRepository.saveProfile.mockResolvedValue({
            ...profile,
            asaasCustomerId: 'cus-1',
        });
        billingRepository.listCards.mockResolvedValue([]);
        paymentGateway.updateCustomer.mockResolvedValue({ id: 'cus-1' });
    });

    it('normalizes and synchronizes billing data with the provider', async () => {
        const useCase = new SaveBillingProfileUseCase(billingRepository as any, paymentGateway as any);

        const result = await useCase.execute('user-1', {
            fullName: '  Maria   da Silva ',
            cpfCnpj: '529.982.247-25',
            email: 'MARIA@EXAMPLE.COM ',
            mobilePhone: '(11) 99999-9999',
            postalCode: '01310-100',
            addressNumber: ' 100 ',
            addressComplement: ' Apto 12 ',
        });

        expect(billingRepository.saveProfile).toHaveBeenCalledWith({
            userId: 'user-1',
            fullName: 'Maria da Silva',
            cpfCnpj: '52998224725',
            email: 'maria@example.com',
            mobilePhone: '11999999999',
            postalCode: '01310100',
            addressNumber: '100',
            addressComplement: 'Apto 12',
        });
        expect(paymentGateway.updateCustomer).toHaveBeenCalledWith(
            'cus-1',
            expect.objectContaining({ externalReference: 'user-1' })
        );
        expect(result).toEqual(expect.objectContaining({ pixReady: true, cardReady: true }));
    });

    it('stores only provider token and safe card metadata', async () => {
        paymentGateway.tokenizeCreditCard.mockResolvedValue({
            creditCardToken: 'tok-safe-1',
            creditCardNumber: '1111',
            creditCardBrand: 'VISA',
        });
        billingRepository.saveCard.mockImplementation(async (data: any) => ({
            id: 'card-1',
            ...data,
            provider: 'ASAAS',
            createdAt: now,
            updatedAt: now,
        }));
        const useCase = new AddPaymentCardUseCase(billingRepository as any, paymentGateway as any);

        const result = await useCase.execute('user-1', {
            holderName: 'MARIA DA SILVA',
            number: '4111 1111 1111 1111',
            expiryMonth: 12,
            expiryYear: 2030,
            ccv: '123',
            isDefault: true,
        }, '::ffff:192.0.2.10');

        expect(paymentGateway.tokenizeCreditCard).toHaveBeenCalledWith(expect.objectContaining({
            customerId: 'cus-1',
            remoteIp: '192.0.2.10',
            creditCard: expect.objectContaining({ number: '4111111111111111', ccv: '123' }),
        }));
        expect(billingRepository.saveCard).toHaveBeenCalledWith(expect.objectContaining({
            providerToken: 'tok-safe-1',
            brand: 'VISA',
            lastFour: '1111',
        }));
        expect(billingRepository.saveCard.mock.calls[0][0]).not.toHaveProperty('number');
        expect(billingRepository.saveCard.mock.calls[0][0]).not.toHaveProperty('ccv');
        expect(result).not.toHaveProperty('providerToken');
    });

    it('returns a sanitized wallet without provider tokens', async () => {
        billingRepository.listCards.mockResolvedValue([{
            id: 'card-1',
            userId: 'user-1',
            billingProfileId: 'profile-billing-1',
            provider: 'ASAAS',
            providerToken: 'tok-must-stay-private',
            brand: 'VISA',
            lastFour: '4444',
            holderName: 'MARIA DA SILVA',
            expiryMonth: 12,
            expiryYear: 2030,
            isDefault: true,
            createdAt: now,
            updatedAt: now,
        }]);
        const useCase = new GetBillingWalletUseCase(billingRepository as any);

        const wallet = await useCase.execute('user-1');

        expect(wallet.cards[0]).not.toHaveProperty('providerToken');
        expect(wallet.cards[0]).toEqual(expect.objectContaining({ lastFour: '4444', isDefault: true }));
        expect(wallet.environment).toBe('sandbox');
    });
});
