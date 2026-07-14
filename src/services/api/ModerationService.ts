import { API_URL } from '@/shared/config/api';
import { supabase } from '@/shared/lib/supabase';

export type ReportTargetType = 'EVENT' | 'USER' | 'REVIEW';
export type ReportReason =
    | 'SPAM'
    | 'HARASSMENT'
    | 'INAPPROPRIATE_CONTENT'
    | 'SCAM'
    | 'VIOLENCE'
    | 'OTHER';

export interface CreateReportDTO {
    targetType: ReportTargetType;
    targetId: string;
    reason: ReportReason;
    details?: string;
}

async function getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('User not authenticated');

    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
    };
}

export const moderationService = {
    async report(data: CreateReportDTO) {
        const response = await fetch(`${API_URL}/reports`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to submit report');
        }
        return response.json();
    },

    async block(blockedId: string) {
        const response = await fetch(`${API_URL}/blocks`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({ blockedId }),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to block user');
        }
        return true;
    },

    async unblock(blockedId: string) {
        const response = await fetch(`${API_URL}/blocks/${blockedId}`, {
            method: 'DELETE',
            headers: await getAuthHeaders(),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to unblock user');
        }
        return true;
    },

    async listBlocked(): Promise<string[]> {
        const response = await fetch(`${API_URL}/blocks`, {
            headers: await getAuthHeaders(),
        });
        if (!response.ok) return [];
        const data = await response.json().catch(() => ({ blockedIds: [] }));
        return data.blockedIds ?? [];
    },
};
