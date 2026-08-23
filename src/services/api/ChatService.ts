import { API_URL } from '@/shared/config/api';
import { supabase } from '@/shared/lib/supabase';

export interface ChatParticipant {
    id: string;
    fullName?: string | null;
    avatarUrl?: string | null;
}

export interface ChatMessage {
    id: string;
    conversationId: string;
    senderId?: string | null;
    kind: 'USER' | 'SYSTEM';
    body: string;
    metadata?: { type?: string; address?: string; [key: string]: unknown } | null;
    createdAt: string;
}

export interface ChatConversation {
    id: string;
    eventId: string;
    hostId: string;
    guestId: string;
    bookingId?: string | null;
    lastMessageAt: string;
    unreadCount?: number;
    event: {
        id: string;
        title: string;
        eventDate: string;
        coverImageUrl?: string | null;
    };
    host: ChatParticipant;
    guest: ChatParticipant;
    lastMessage?: ChatMessage | null;
}

class ChatService {
    private async headers(): Promise<Record<string, string>> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Entre na sua conta para acessar as mensagens.');
        return {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
        };
    }

    private async request<T>(path: string, init?: RequestInit): Promise<T> {
        const response = await fetch(`${API_URL}${path}`, {
            ...init,
            headers: { ...(await this.headers()), ...(init?.headers || {}) },
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Não foi possível acessar as mensagens.');
        }
        if (response.status === 204) return undefined as T;
        return response.json();
    }

    open(eventId: string, guestId?: string): Promise<ChatConversation> {
        return this.request('/conversations', {
            method: 'POST',
            body: JSON.stringify({ eventId, ...(guestId ? { guestId } : {}) }),
        });
    }

    list(): Promise<ChatConversation[]> {
        return this.request('/conversations');
    }

    get(id: string): Promise<ChatConversation> {
        return this.request(`/conversations/${encodeURIComponent(id)}`);
    }

    messages(id: string): Promise<ChatMessage[]> {
        return this.request(`/conversations/${encodeURIComponent(id)}/messages?limit=100`);
    }

    send(id: string, body: string): Promise<ChatMessage> {
        return this.request(`/conversations/${encodeURIComponent(id)}/messages`, {
            method: 'POST',
            body: JSON.stringify({ body }),
        });
    }

    markRead(id: string): Promise<void> {
        return this.request(`/conversations/${encodeURIComponent(id)}/read`, { method: 'PUT' });
    }
}

export const chatService = new ChatService();
