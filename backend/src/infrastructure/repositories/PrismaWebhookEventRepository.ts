import { Prisma } from '@prisma/client';
import { WebhookEventRepository } from '../../domain/repositories/WebhookEventRepository';
import { prisma } from '../database/prismaClient';

export class PrismaWebhookEventRepository implements WebhookEventRepository {
    async startProcessing(data: {
        id: string;
        provider: string;
        eventType: string;
        payload: unknown;
    }): Promise<boolean> {
        try {
            await prisma.paymentWebhookEvent.create({
                data: {
                    id: data.id,
                    provider: data.provider,
                    eventType: data.eventType,
                    payload: data.payload as Prisma.InputJsonValue,
                    status: 'PROCESSING',
                },
            });
            return true;
        } catch (error) {
            if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
                throw error;
            }
        }

        const retryBefore = new Date(Date.now() - 5 * 60 * 1000);
        const claimed = await prisma.paymentWebhookEvent.updateMany({
            where: {
                id: data.id,
                OR: [
                    { status: 'FAILED' },
                    { status: 'PROCESSING', updatedAt: { lt: retryBefore } },
                ],
            },
            data: {
                status: 'PROCESSING',
                error: null,
                attempts: { increment: 1 },
            },
        });

        return claimed.count === 1;
    }

    async markProcessed(id: string): Promise<void> {
        await prisma.paymentWebhookEvent.update({
            where: { id },
            data: {
                status: 'PROCESSED',
                processedAt: new Date(),
                error: null,
            },
        });
    }

    async markFailed(id: string, error: string): Promise<void> {
        await prisma.paymentWebhookEvent.update({
            where: { id },
            data: {
                status: 'FAILED',
                error: error.substring(0, 2000),
            },
        });
    }
}
