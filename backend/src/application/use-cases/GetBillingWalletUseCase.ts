import { BillingProfile, PaymentCard } from '../../domain/entities/Billing';
import { BillingRepository } from '../../domain/repositories/BillingRepository';

export interface BillingWalletResult {
    profile: {
        fullName: string;
        cpfCnpj: string;
        email: string;
        mobilePhone: string;
        postalCode?: string;
        addressNumber?: string;
        addressComplement?: string;
    } | null;
    pixReady: boolean;
    cardReady: boolean;
    cards: Array<{
        id: string;
        brand: string;
        lastFour: string;
        holderName: string;
        expiryMonth: number;
        expiryYear: number;
        isDefault: boolean;
    }>;
    environment: 'sandbox' | 'production';
}

export class GetBillingWalletUseCase {
    constructor(private billingRepository: BillingRepository) {}

    async execute(userId: string): Promise<BillingWalletResult> {
        const [profile, cards] = await Promise.all([
            this.billingRepository.findProfileByUserId(userId),
            this.billingRepository.listCards(userId),
        ]);

        return {
            profile: profile ? this.toProfile(profile) : null,
            pixReady: Boolean(profile),
            cardReady: this.isCardReady(profile),
            cards: cards.map((card) => this.toCard(card)),
            environment: (process.env.ASAAS_BASE_URL || '').includes('sandbox') ? 'sandbox' : 'production',
        };
    }

    private isCardReady(profile: BillingProfile | null): boolean {
        return Boolean(profile?.postalCode && profile.addressNumber);
    }

    private toProfile(profile: BillingProfile): NonNullable<BillingWalletResult['profile']> {
        return {
            fullName: profile.fullName,
            cpfCnpj: profile.cpfCnpj,
            email: profile.email,
            mobilePhone: profile.mobilePhone,
            postalCode: profile.postalCode,
            addressNumber: profile.addressNumber,
            addressComplement: profile.addressComplement,
        };
    }

    private toCard(card: PaymentCard): BillingWalletResult['cards'][number] {
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
}
