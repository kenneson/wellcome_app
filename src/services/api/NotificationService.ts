import { API_URL } from '@/shared/config/api';
import { supabase } from '@/shared/lib/supabase';

export interface Notification {
    id: string;
    title: string;
    body: string;
    type: string;
    read: boolean;
    createdAt: string;
    data?: any;
}

export const notificationService = {
    async list(): Promise<Notification[]> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('User not authenticated');

        const response = await fetch(`${API_URL}/notifications`, {
            headers: {
                Authorization: `Bearer ${session.access_token}`,
            },
        });
        if (!response.ok) throw new Error('Failed to fetch notifications');
        
        return response.json();
    },

    async markAsRead(id: string): Promise<void> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('User not authenticated');

        const response = await fetch(`${API_URL}/notifications/${id}/read`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${session.access_token}`,
            },
        });
        if (!response.ok) throw new Error('Failed to mark notification as read');
    }
};
