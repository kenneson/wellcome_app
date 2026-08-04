import { BillingProfile } from '../../domain/entities/Billing';
import { BillingRepository } from '../../domain/repositories/BillingRepository';
import { AsaasCustomerInput, PaymentGateway } from '../../domain/services/PaymentGateway';

export class EnsureAsaasCustomerService {
    constructor(
        private billingRepository: BillingRepository,
        private paymentGateway: PaymentGateway
    ) {}

    async execute(profile: BillingProfile, synchronize = false): Promise<BillingProfile> {
        const input = this.toCustomerInput(profile);

        if (profile.asaasCustomerId) {
            if (synchronize) {
                await this.paymentGateway.updateCustomer(profile.asaasCustomerId, input);
            }
            return profile;
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
}
