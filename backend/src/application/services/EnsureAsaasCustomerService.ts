import { BillingProfile } from '../../domain/entities/Billing';
import { BillingRepository } from '../../domain/repositories/BillingRepository';
import {
    AsaasCustomerInput,
    PaymentGateway,
    PaymentGatewayError,
} from '../../domain/services/PaymentGateway';

export class EnsureAsaasCustomerService {
    constructor(
        private billingRepository: BillingRepository,
        private paymentGateway: PaymentGateway
    ) {}

    async execute(profile: BillingProfile, synchronize = false): Promise<BillingProfile> {
        const input = this.toCustomerInput(profile);

        if (profile.asaasCustomerId) {
            if (synchronize) {
                try {
                    await this.paymentGateway.updateCustomer(profile.asaasCustomerId, input);
                    return profile;
                } catch (error) {
                    if (!this.isMissingCustomer(error)) throw error;
                }
            } else {
                return profile;
            }
        }

        const existing = await this.paymentGateway.findCustomerByExternalReference(profile.userId);
        const customer = existing || await this.paymentGateway.createCustomer(input);
        return this.billingRepository.setAsaasCustomerId(profile.id, customer.id);
    }

    private toCustomerInput(profile: BillingProfile): AsaasCustomerInput {
        return {
            name: profile.fullName,
            cpfCnpj: profile.cpfCnpj,
            email: profile.email,
            mobilePhone: profile.mobilePhone,
            externalReference: profile.userId,
            postalCode: profile.postalCode,
            addressNumber: profile.addressNumber,
            addressComplement: profile.addressComplement,
        };
    }

    private isMissingCustomer(error: unknown): boolean {
        if (!(error instanceof PaymentGatewayError)) return false;
        if (error.statusCode === 404) return true;

        const code = error.code?.toLowerCase() || '';
        const message = error.message
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();

        return error.statusCode === 400 && (
            code.includes('invalid_customer')
            || message.includes('customer invalido')
            || message.includes('customer nao informado')
        );
    }
}
