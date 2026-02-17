import { API_URL } from '@/shared/config/api';

export interface CreateReviewDTO {
    eventId: string;
    userId: string;
    rating: number;
    comment?: string;
}

export const reviewService = {
    async create(data: CreateReviewDTO) {
        const response = await fetch(`${API_URL}/reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create review');
        }

        return response.json();
    },

    async delete(id: string, userId: string) {
        const response = await fetch(`${API_URL}/reviews/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete review');
        }

        return true; // 204 No Content
    }
};
