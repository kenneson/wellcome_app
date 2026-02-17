import { EventReviewRepository } from '../../domain/repositories/EventReviewRepository';

export class DeleteReviewUseCase {
    constructor(private reviewRepository: EventReviewRepository) { }

    async execute(reviewId: string, userId: string): Promise<void> {
        const review = await this.reviewRepository.findById(reviewId);

        if (!review) {
            throw new Error('Review not found');
        }

        if (review.userId !== userId) {
            throw new Error('Only the author can delete this review');
        }

        await this.reviewRepository.delete(reviewId);
    }
}
