import { EventReviewRepository } from '../../domain/repositories/EventReviewRepository';
import { EventRepository } from '../../domain/repositories/EventRepository';
import { EventReview } from '../../domain/entities/EventReview';
import { SendNotificationUseCase } from './SendNotificationUseCase';
import { NotificationType } from '../../domain/value-objects/NotificationType';

export class CreateReviewUseCase {
    constructor(
        private reviewRepository: EventReviewRepository,
        private eventRepository: EventRepository,
        private sendNotificationUseCase: SendNotificationUseCase
    ) { }

    async execute(data: { eventId: string; userId: string; rating: number; comment?: string }): Promise<EventReview> {
        if (data.rating < 1 || data.rating > 5) {
            throw new Error('Rating must be between 1 and 5');
        }

        const review = await this.reviewRepository.create({
            eventId: data.eventId,
            userId: data.userId,
            rating: data.rating,
            comment: data.comment || null
        });

        // Notify Host
        const event = await this.eventRepository.findById(data.eventId);
        if (event && event.host) {
            const reviewerName = review.user?.fullName || 'Um usuário';
            await this.sendNotificationUseCase.execute(
                event.host.id,
                event.host.expoPushToken || null,
                'Nova Avaliação! ⭐',
                `${reviewerName} avaliou seu evento "${event.title}" com ${data.rating} estrelas.`,
                NotificationType.NEW_REVIEW,
                { eventId: event.id }
            );
        }

        return review;
    }
}
