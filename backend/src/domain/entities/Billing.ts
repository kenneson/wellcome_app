export interface BillingProfile {
    id: string;
    userId: string;
    asaasCustomerId?: string;
    fullName: string;
    cpfCnpj: string;
    email: string;
    mobilePhone: string;
    postalCode?: string;
    addressNumber?: string;
    addressComplement?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface PaymentCard {
    id: string;
    userId: string;
    billingProfileId: string;
    provider: string;
    providerToken: string;
    brand: string;
    lastFour: string;
    holderName: string;
    expiryMonth: number;
    expiryYear: number;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
}
