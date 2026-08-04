import { API_URL } from '@/shared/config/api';
import { supabase } from '@/shared/lib/supabase';

export interface BillingProfileData {
    fullName: string;
    cpfCnpj: string;
    email: string;
    mobilePhone: string;
    postalCode?: string;
    addressNumber?: string;
    addressComplement?: string;
}

export interface SavedPaymentCard {
    id: string;
    brand: string;
    lastFour: string;
    holderName: string;
    expiryMonth: number;
    expiryYear: number;
    isDefault: boolean;
}

export interface BillingWallet {
    profile: BillingProfileData | null;
    pixReady: boolean;
    cardReady: boolean;
    cards: SavedPaymentCard[];
    environment: 'sandbox' | 'production';
}

export interface AddCardData {
    holderName: string;
    number: string;
    expiryMonth: number;
    expiryYear: number;
    ccv: string;
    isDefault: boolean;
}

export interface PixPaymentResult {
    paymentId: string;
    providerPaymentId: string;
    value: string;
    status: string;
    paid: boolean;
    awaitingSettlement: boolean;
    pixCopyPaste: string;
    expirationDate: string;
    environment: 'sandbox' | 'production';
}

export class PaymentService {
    private async headers(): Promise<Record<string, string>> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Sessao expirada. Faca login novamente.');
        return {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
        };
    }

    async getWallet(): Promise<BillingWallet> {
        return this.request<BillingWallet>('/billing');
    }

    async saveBillingProfile(data: BillingProfileData): Promise<void> {
        await this.request('/billing/profile', { method: 'PUT', body: JSON.stringify(data) });
    }

    async addCard(data: AddCardData): Promise<SavedPaymentCard> {
        return this.request<SavedPaymentCard>('/billing/cards', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async deleteCard(cardId: string): Promise<void> {
        await this.request(`/billing/cards/${cardId}`, { method: 'DELETE' });
    }

    async setDefaultCard(cardId: string): Promise<SavedPaymentCard> {
        return this.request<SavedPaymentCard>(`/billing/cards/${cardId}/default`, { method: 'PUT' });
    }

    async createPixPayment(bookingId: string, eventId: string): Promise<PixPaymentResult> {
        return this.request<PixPaymentResult>('/payments/pix', {
            method: 'POST',
            body: JSON.stringify({ bookingId, eventId }),
        });
    }

    async payWithCard(bookingId: string, eventId: string, cardId: string) {
        return this.request<{ status: string; paid: boolean }>('/payments/card', {
            method: 'POST',
            body: JSON.stringify({ bookingId, eventId, cardId }),
        });
    }

    private async request<T = void>(path: string, init: RequestInit = {}): Promise<T> {
        const response = await fetch(`${API_URL}${path}`, {
            ...init,
            headers: { ...(await this.headers()), ...init.headers },
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Nao foi possivel concluir a operacao');
        }
        if (response.status === 204) return undefined as T;
        return response.json();
    }
}

export const paymentService = new PaymentService();
