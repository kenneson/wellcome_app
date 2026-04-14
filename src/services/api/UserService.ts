import { API_URL } from '@/shared/config/api';

export interface UserProfile {
    id: string;
    fullName: string | null;
    username: string | null;
    avatarUrl: string | null;
    bio: string | null;
    occupation: string | null;
    lookingFor: string | null;
    city: string | null;
    neighborhood: string | null;
    dietaryRestrictions: string[];
    languages: string[];
    events: any[];
    bookings: any[];
    averageRating?: number;
    walletBalance?: number;
    pixKey?: string | null;
    pixKeyType?: string | null;
}

export class UserService {
    private apiUrl = `${API_URL}/users`;

    async getProfile(userId: string): Promise<UserProfile> {
        const response = await fetch(`${this.apiUrl}/${userId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch profile');
        }
        return response.json();
    }

    async updateProfile(userId: string, data: {
        pix_key?: string;
        pix_key_type?: string;
        [key: string]: any;
    }): Promise<UserProfile> {
        const response = await fetch(`${this.apiUrl}/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Failed to update profile');
        }
        return response.json();
    }
}

export const userService = new UserService();
