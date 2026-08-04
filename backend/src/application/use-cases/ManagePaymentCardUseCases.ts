import { BillingRepository } from '../../domain/repositories/BillingRepository';

export class DeletePaymentCardUseCase {
    constructor(private billingRepository: BillingRepository) {}

    async execute(userId: string, cardId: string): Promise<void> {
        const deleted = await this.billingRepository.deleteCard(userId, cardId);
        if (!deleted) throw new Error('Cartao nao encontrado');
    }
}

export class SetDefaultPaymentCardUseCase {
    constructor(private billingRepository: BillingRepository) {}

    async execute(userId: string, cardId: string) {
        const card = await this.billingRepository.setDefaultCard(userId, cardId);
        if (!card) throw new Error('Cartao nao encontrado');
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
