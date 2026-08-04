import { BillingRepository } from '../../domain/repositories/BillingRepository';
import { PaymentGateway } from '../../domain/services/PaymentGateway';
import {
    isValidCardExpiry,
    isValidCardNumber,
    onlyDigits,
} from '../../domain/services/PaymentValidation';
import { EnsureAsaasCustomerService } from '../services/EnsureAsaasCustomerService';

export interface AddPaymentCardInput {
    holderName: string;
    number: string;
    expiryMonth: number;
    expiryYear: number;
    ccv: string;
    isDefault?: boolean;
}

export class AddPaymentCardUseCase {
    private ensureCustomerService: EnsureAsaasCustomerService;

    constructor(
        private billingRepository: BillingRepository,
        private paymentGateway: PaymentGateway
    ) {
        this.ensureCustomerService = new EnsureAsaasCustomerService(billingRepository, paymentGateway);
    }

    async execute(userId: string, input: AddPaymentCardInput, remoteIp: string) {
        const profile = await this.billingRepository.findProfileByUserId(userId);
        if (!profile) throw new Error('Complete seus dados de cobranca');
        if (!profile.postalCode || !profile.addressNumber) {
            throw new Error('Complete o endereco de cobranca');
        }

        const number = onlyDigits(input.number);
        const ccv = onlyDigits(input.ccv);
        const holderName = input.holderName.trim().replace(/\s+/g, ' ');
        if (holderName.length < 3) throw new Error('Nome no cartao invalido');
        if (!isValidCardNumber(number)) throw new Error('Numero do cartao invalido');
        if (!isValidCardExpiry(input.expiryMonth, input.expiryYear)) {
            throw new Error('Validade do cartao invalida');
        }
        if (ccv.length < 3 || ccv.length > 4) throw new Error('Codigo de seguranca invalido');

        const synchronizedProfile = await this.ensureCustomerService.execute(profile);
        if (!synchronizedProfile.asaasCustomerId) throw new Error('Cliente Asaas indisponivel');
        if (!synchronizedProfile.postalCode || !synchronizedProfile.addressNumber) {
            throw new Error('Complete o endereco de cobranca');
        }

        const tokenized = await this.paymentGateway.tokenizeCreditCard({
            customerId: synchronizedProfile.asaasCustomerId,
            creditCard: {
                holderName,
                number,
                expiryMonth: String(input.expiryMonth).padStart(2, '0'),
                expiryYear: String(input.expiryYear),
                ccv,
            },
            holderInfo: {
                name: synchronizedProfile.fullName,
                email: synchronizedProfile.email,
                cpfCnpj: synchronizedProfile.cpfCnpj,
                postalCode: synchronizedProfile.postalCode,
                addressNumber: synchronizedProfile.addressNumber,
                addressComplement: synchronizedProfile.addressComplement,
                phone: synchronizedProfile.mobilePhone,
                mobilePhone: synchronizedProfile.mobilePhone,
            },
            remoteIp: this.normalizeRemoteIp(remoteIp),
        });

        if (!tokenized.creditCardToken) throw new Error('Token do cartao nao retornado pelo Asaas');
        const card = await this.billingRepository.saveCard({
            userId,
            billingProfileId: synchronizedProfile.id,
            providerToken: tokenized.creditCardToken,
            brand: tokenized.creditCardBrand || 'CREDIT_CARD',
            lastFour: onlyDigits(tokenized.creditCardNumber || number).slice(-4),
            holderName,
            expiryMonth: input.expiryMonth,
            expiryYear: input.expiryYear,
            isDefault: Boolean(input.isDefault),
        });

        return {
            id: card.id,
            brand: card.brand,
            lastFour: card.lastFour,
            holderName: card.holderName,
            expiryMonth: card.expiryMonth,
            expiryYear: card.expiryYear,
            isDefault: card.isDefault,
        };
    }

    private normalizeRemoteIp(remoteIp: string): string {
        const normalized = remoteIp.replace(/^::ffff:/, '');
        return normalized === '::1' ? '127.0.0.1' : normalized;
    }
}
