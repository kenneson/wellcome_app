import { API_URL } from '@/shared/config/api';

export interface UserProfile {
    id: string;
    fullName: string;
    username: string;
    avatarUrl: string | null;
    bio: string | null;
    occupation: string | null;
    lookingFor: string | null;
    city: string | null;
    neighborhood: string | null;
    dietaryRestrictions: string[];
    languages: string[];
    events: any[]; // Define proper type if available
    bookings: any[]; // Define proper type if available
    averageRating?: number; // Not yet implemented in backend
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
}

export const userService = new UserService();
