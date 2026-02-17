import { EventReview } from '../entities/EventReview';

export interface EventReviewRepository {
    create(review: Omit<EventReview, 'id' | 'createdAt' | 'user'>): Promise<EventReview>;
    findByEventId(eventId: string): Promise<EventReview[]>;
    delete(id: string): Promise<void>;
    findById(id: string): Promise<EventReview | null>;
}
