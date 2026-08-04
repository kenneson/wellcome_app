import { API_URL } from '@/shared/config/api';
import { supabase } from '@/shared/lib/supabase';

export type KycReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type WithdrawalStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type ReportStatus = 'PENDING' | 'RESOLVED' | 'DISMISSED';

export interface AdminIdentity {
    id: string;
    email: string | null;
    fullName: string | null;
    role: 'ADMIN';
}

export interface AdminOverview {
    totalUsers: number;
    pendingKyc: number;
    pendingReports: number;
    pendingWithdrawals: number;
    processingWithdrawals: number;
}

export interface KycRequest {
    id: string;
    fullName: string | null;
    email: string | null;
    city: string | null;
    avatarUrl: string | null;
    kycStatus: KycReviewStatus;
    kycDocumentSignedUrl: string | null;
    kycSelfieSignedUrl: string | null;
    kycSimilarityScore: number | null;
    kycSubmittedAt: string | null;
    kycReviewedAt: string | null;
    kycRejectionReason: string | null;
}

export interface WithdrawalRequest {
    id: string;
    userId: string;
    userName: string | null;
    amount: number;
    pixKey: string;
    pixKeyType: string | null;
    status: WithdrawalStatus;
    efiEndToEndId: string | null;
    createdAt: string;
}

export interface ModerationReport {
    id: string;
    targetType: 'EVENT' | 'USER' | 'REVIEW';
    targetId: string;
    reason: string;
    details: string | null;
    status: ReportStatus;
    createdAt: string;
    reporterName: string | null;
    targetLabel: string;
    targetDetail: string;
}

class AdminService {
    private async getAuthHeaders(includeJsonContentType: boolean = false): Promise<Record<string, string>> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
            throw new Error('Sessao expirada. Faca login novamente.');
        }

        return {
            ...(includeJsonContentType ? { 'Content-Type': 'application/json' } : {}),
            Authorization: `Bearer ${session.access_token}`,
        };
    }

    private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
        const response = await fetch(`${API_URL}${path}`, {
            ...init,
            headers: {
                ...(await this.getAuthHeaders(Boolean(init.body))),
                ...(init.headers || {}),
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Nao foi possivel concluir a operacao administrativa.');
        }

        if (response.status === 204) {
            return undefined as T;
        }

        return response.json();
    }

    getMe() {
        return this.request<AdminIdentity>('/admin/me');
    }

    getOverview() {
        return this.request<AdminOverview>('/admin/overview');
    }

    getKycRequests(status: 'ALL' | KycReviewStatus = 'PENDING') {
        return this.request<KycRequest[]>(`/admin/kyc?status=${status}`);
    }

    approveKyc(id: string) {
        return this.request(`/admin/kyc/${id}/approve`, { method: 'POST' });
    }

    rejectKyc(id: string, reason: string) {
        return this.request(`/admin/kyc/${id}/reject`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        });
    }

    getWithdrawals() {
        return this.request<WithdrawalRequest[]>('/admin/withdrawals');
    }

    approveWithdrawal(id: string) {
        return this.request(`/admin/withdrawals/${id}/approve`, { method: 'POST' });
    }

    getReports(status: ReportStatus = 'PENDING') {
        return this.request<ModerationReport[]>(`/admin/reports?status=${status}`);
    }

    resolveReport(id: string, status: Exclude<ReportStatus, 'PENDING'>) {
        return this.request(`/admin/reports/${id}/resolve`, {
            method: 'POST',
            body: JSON.stringify({ status }),
        });
    }
}

export const adminService = new AdminService();
