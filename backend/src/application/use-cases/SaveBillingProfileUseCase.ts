import { BillingRepository, SaveBillingProfileData } from '../../domain/repositories/BillingRepository';
import { PaymentGateway } from '../../domain/services/PaymentGateway';
import { isValidCpfCnpj, onlyDigits } from '../../domain/services/PaymentValidation';
import { EnsureAsaasCustomerService } from '../services/EnsureAsaasCustomerService';

export interface SaveBillingProfileInput extends Omit<SaveBillingProfileData, 'userId'> {}

export class SaveBillingProfileUseCase {
    private ensureCustomerService: EnsureAsaasCustomerService;

    constructor(
        private billingRepository: BillingRepository,
        paymentGateway: PaymentGateway
    ) {
        this.ensureCustomerService = new EnsureAsaasCustomerService(billingRepository, paymentGateway);
    }

    async execute(userId: string, input: SaveBillingProfileInput) {
        const data = this.normalize(userId, input);
        this.validate(data);

        const saved = await this.billingRepository.saveProfile(data);
        const synchronized = await this.ensureCustomerService.execute(saved, true);

        return {
            fullName: synchronized.fullName,
            cpfCnpj: synchronized.cpfCnpj,
            email: synchronized.email,
            mobilePhone: synchronized.mobilePhone,
            postalCode: synchronized.postalCode,
            addressNumber: synchronized.addressNumber,
            addressComplement: synchronized.addressComplement,
            pixReady: true,
            cardReady: Boolean(synchronized.postalCode && synchronized.addressNumber),
        };
    }

    private normalize(userId: string, input: SaveBillingProfileInput): SaveBillingProfileData {
        return {
            userId,
            fullName: input.fullName.trim().replace(/\s+/g, ' '),
            cpfCnpj: onlyDigits(input.cpfCnpj),
            email: input.email.trim().toLowerCase(),
            mobilePhone: onlyDigits(input.mobilePhone),
            postalCode: input.postalCode ? onlyDigits(input.postalCode) : undefined,
            addressNumber: input.addressNumber?.trim() || undefined,
            addressComplement: input.addressComplement?.trim() || undefined,
        };
    }

    private validate(data: SaveBillingProfileData): void {
        if (data.fullName.length < 3) throw new Error('Informe o nome completo');
        if (!isValidCpfCnpj(data.cpfCnpj)) throw new Error('CPF ou CNPJ invalido');
        if (!/^\S+@\S+\.\S+$/.test(data.email)) throw new Error('E-mail invalido');
        if (data.mobilePhone.length < 10 || data.mobilePhone.length > 13) {
            throw new Error('Celular invalido');
        }
        if (data.postalCode && data.postalCode.length !== 8) throw new Error('CEP invalido');
        if (data.addressNumber && !data.postalCode) throw new Error('Informe o CEP do endereco');
        if (data.postalCode && !data.addressNumber) throw new Error('Informe o numero do endereco');
    }
}
