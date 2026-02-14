export interface EventReview {
    id: string;
    eventId: string;
    userId: string;
    rating: number; // 1-5
    comment: string | null;
    createdAt: Date;
    user?: {
        id: string;
        fullName: string | null;
        avatarUrl: string | null;
    };
}
