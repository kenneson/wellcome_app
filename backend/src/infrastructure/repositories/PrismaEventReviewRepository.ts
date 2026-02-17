import { EventReviewRepository } from '../../domain/repositories/EventReviewRepository';
import { EventReview } from '../../domain/entities/EventReview';
import { prisma } from '../database/prismaClient';

export class PrismaEventReviewRepository implements EventReviewRepository {
    async create(review: Omit<EventReview, 'id' | 'createdAt' | 'user'>): Promise<EventReview> {
        const created = await prisma.eventReview.create({
            data: {
                eventId: review.eventId,
                userId: review.userId,
                rating: review.rating,
                comment: review.comment
            },
            include: {
                user: true
            }
        });

        return {
            id: created.id,
            eventId: created.eventId,
            userId: created.userId,
            rating: created.rating,
            comment: created.comment,
            createdAt: created.createdAt,
            user: created.user ? {
                id: created.user.id,
                fullName: created.user.fullName,
                avatarUrl: created.user.avatarUrl
            } : undefined
        };
    }

    async findByEventId(eventId: string): Promise<EventReview[]> {
        const reviews = await prisma.eventReview.findMany({
            where: { eventId },
            include: { user: true },
            orderBy: { createdAt: 'desc' }
        });

        return reviews.map(r => ({
            id: r.id,
            eventId: r.eventId,
            userId: r.userId,
            rating: r.rating,
            comment: r.comment,
            createdAt: r.createdAt,
            user: r.user ? {
                id: r.user.id,
                fullName: r.user.fullName,
                avatarUrl: r.user.avatarUrl
            } : undefined
        }));
    }

    async findById(id: string): Promise<EventReview | null> {
        const review = await prisma.eventReview.findUnique({
            where: { id },
            include: { user: true }
        });

        if (!review) return null;

        return {
            id: review.id,
            eventId: review.eventId,
            userId: review.userId,
            rating: review.rating,
            comment: review.comment,
            createdAt: review.createdAt,
            user: review.user ? {
                id: review.user.id,
                fullName: review.user.fullName,
                avatarUrl: review.user.avatarUrl
            } : undefined
        };
    }

    async delete(id: string): Promise<void> {
        await prisma.eventReview.delete({ where: { id } });
    }
}
