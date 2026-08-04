import { BillingProfile, PaymentCard } from '../../domain/entities/Billing';
import {
    BillingRepository,
    SaveBillingProfileData,
    SavePaymentCardData,
} from '../../domain/repositories/BillingRepository';
import { prisma } from '../database/prismaClient';

export class PrismaBillingRepository implements BillingRepository {
    async findProfileByUserId(userId: string): Promise<BillingProfile | null> {
        const profile = await prisma.billingProfile.findUnique({ where: { userId } });
        return profile ? this.toProfile(profile) : null;
    }

    async saveProfile(data: SaveBillingProfileData): Promise<BillingProfile> {
        const profile = await prisma.billingProfile.upsert({
            where: { userId: data.userId },
            create: data,
            update: {
                fullName: data.fullName,
                cpfCnpj: data.cpfCnpj,
                email: data.email,
                mobilePhone: data.mobilePhone,
                postalCode: data.postalCode,
                addressNumber: data.addressNumber,
                addressComplement: data.addressComplement,
            },
        });

        return this.toProfile(profile);
    }

    async setAsaasCustomerId(profileId: string, customerId: string): Promise<BillingProfile> {
        const profile = await prisma.billingProfile.update({
            where: { id: profileId },
            data: { asaasCustomerId: customerId },
        });
        return this.toProfile(profile);
    }

    async listCards(userId: string): Promise<PaymentCard[]> {
        const cards = await prisma.paymentCard.findMany({
            where: { userId },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        });
        return cards.map((card) => this.toCard(card));
    }

    async findCardById(userId: string, cardId: string): Promise<PaymentCard | null> {
        const card = await prisma.paymentCard.findFirst({ where: { id: cardId, userId } });
        return card ? this.toCard(card) : null;
    }

    async saveCard(data: SavePaymentCardData): Promise<PaymentCard> {
        const card = await prisma.$transaction(async (tx) => {
            const existingCount = await tx.paymentCard.count({ where: { userId: data.userId } });
            const makeDefault = data.isDefault || existingCount === 0;

            if (makeDefault) {
                await tx.paymentCard.updateMany({
                    where: { userId: data.userId, isDefault: true },
                    data: { isDefault: false },
                });
            }

            return tx.paymentCard.create({
                data: {
                    ...data,
                    provider: 'ASAAS',
                    isDefault: makeDefault,
                },
            });
        });

        return this.toCard(card);
    }

    async deleteCard(userId: string, cardId: string): Promise<boolean> {
        return prisma.$transaction(async (tx) => {
            const card = await tx.paymentCard.findFirst({ where: { id: cardId, userId } });
            if (!card) return false;

            await tx.paymentCard.delete({ where: { id: card.id } });
            if (card.isDefault) {
                const replacement = await tx.paymentCard.findFirst({
                    where: { userId },
                    orderBy: { createdAt: 'desc' },
                });
                if (replacement) {
                    await tx.paymentCard.update({
                        where: { id: replacement.id },
                        data: { isDefault: true },
                    });
                }
            }

            return true;
        });
    }

    async setDefaultCard(userId: string, cardId: string): Promise<PaymentCard | null> {
        const card = await prisma.$transaction(async (tx) => {
            const ownedCard = await tx.paymentCard.findFirst({ where: { id: cardId, userId } });
            if (!ownedCard) return null;

            await tx.paymentCard.updateMany({
                where: { userId, isDefault: true },
                data: { isDefault: false },
            });
            return tx.paymentCard.update({
                where: { id: ownedCard.id },
                data: { isDefault: true },
            });
        });

        return card ? this.toCard(card) : null;
    }

    private toProfile(raw: any): BillingProfile {
        return {
            id: raw.id,
            userId: raw.userId,
            asaasCustomerId: raw.asaasCustomerId ?? undefined,
            fullName: raw.fullName,
            cpfCnpj: raw.cpfCnpj,
            email: raw.email,
            mobilePhone: raw.mobilePhone,
            postalCode: raw.postalCode ?? undefined,
            addressNumber: raw.addressNumber ?? undefined,
            addressComplement: raw.addressComplement ?? undefined,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        };
    }

    private toCard(raw: any): PaymentCard {
        return {
            id: raw.id,
            userId: raw.userId,
            billingProfileId: raw.billingProfileId,
            provider: raw.provider,
            providerToken: raw.providerToken,
            brand: raw.brand,
            lastFour: raw.lastFour,
            holderName: raw.holderName,
            expiryMonth: raw.expiryMonth,
            expiryYear: raw.expiryYear,
            isDefault: raw.isDefault,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        };
    }
}
