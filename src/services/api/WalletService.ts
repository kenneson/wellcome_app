import { API_URL } from '@/shared/config/api';
import { supabase } from '@/shared/lib/supabase';

export interface WithdrawalResponse {
    id: string;
    userId: string;
    amount: number;
    status: string;
}

export class WalletService {
    private apiUrl = `${API_URL}/withdrawals`;

    private async getAuthHeaders(): Promise<Record<string, string>> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('UsuÃ¡rio nÃ£o autenticado');

        return {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
        };
    }

    async requestWithdrawal(userId: string, amount: number): Promise<WithdrawalResponse> {
        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: await this.getAuthHeaders(),
            body: JSON.stringify({ userId, amount }),
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Erro ao solicitar saque');
        }
        return response.json();
    }
}

export const walletService = new WalletService();
