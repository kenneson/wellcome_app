import { BillingProfile, PaymentCard } from '../entities/Billing';

export interface SaveBillingProfileData {
    userId: string;
    fullName: string;
    cpfCnpj: string;
    email: string;
    mobilePhone: string;
    postalCode?: string;
    addressNumber?: string;
    addressComplement?: string;
}

export interface SavePaymentCardData {
    userId: string;
    billingProfileId: string;
    providerToken: string;
    brand: string;
    lastFour: string;
    holderName: string;
    expiryMonth: number;
    expiryYear: number;
    isDefault: boolean;
}

export interface BillingRepository {
    findProfileByUserId(userId: string): Promise<BillingProfile | null>;
    saveProfile(data: SaveBillingProfileData): Promise<BillingProfile>;
    setAsaasCustomerId(profileId: string, customerId: string): Promise<BillingProfile>;
    listCards(userId: string): Promise<PaymentCard[]>;
    findCardById(userId: string, cardId: string): Promise<PaymentCard | null>;
    saveCard(data: SavePaymentCardData): Promise<PaymentCard>;
    deleteCard(userId: string, cardId: string): Promise<boolean>;
    setDefaultCard(userId: string, cardId: string): Promise<PaymentCard | null>;
}
