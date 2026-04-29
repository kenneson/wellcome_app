import { API_URL } from '@/shared/config/api';
import { supabase } from '@/shared/lib/supabase';

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

    private async getAuthHeaders(includeJsonContentType: boolean = true): Promise<Record<string, string>> {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.access_token) {
            throw new Error('Sessao expirada. Faca login novamente.');
        }

        return {
            ...(includeJsonContentType ? { 'Content-Type': 'application/json' } : {}),
            Authorization: `Bearer ${session.access_token}`,
        };
    }

    private async getOptionalAuthHeaders(): Promise<Record<string, string>> {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.access_token) {
            return {};
        }

        return {
            Authorization: `Bearer ${session.access_token}`,
        };
    }

    async getProfile(userId: string): Promise<UserProfile> {
        const response = await fetch(`${this.apiUrl}/${userId}`, {
            headers: await this.getOptionalAuthHeaders(),
        });
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
            headers: await this.getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Failed to update profile');
        }
        return response.json();
    }

    async deleteAccount(): Promise<void> {
        const response = await fetch(`${this.apiUrl}/me/account`, {
            method: 'DELETE',
            headers: await this.getAuthHeaders(false),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Nao foi possivel excluir a conta');
        }
    }
}

export const userService = new UserService();
