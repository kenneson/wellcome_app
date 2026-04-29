import { API_URL } from '@/shared/config/api';
import { supabase } from '@/shared/lib/supabase';

export interface CreateReviewDTO {
    eventId: string;
    userId: string;
    rating: number;
    comment?: string;
}

export const reviewService = {
    async getAuthHeaders() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('User not authenticated');

        return {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
        };
    },

    async create(data: CreateReviewDTO) {
        const response = await fetch(`${API_URL}/reviews`, {
            method: 'POST',
            headers: await this.getAuthHeaders(),
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
            headers: await this.getAuthHeaders(),
            body: JSON.stringify({ userId }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete review');
        }

        return true;
    }
};
