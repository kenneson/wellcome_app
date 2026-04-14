import { API_URL } from '@/shared/config/api';

export interface WithdrawalResponse {
    id: string;
    userId: string;
    amount: number;
    status: string;
}

export class WalletService {
    private apiUrl = `${API_URL}/withdrawals`;

    async requestWithdrawal(userId: string, amount: number): Promise<WithdrawalResponse> {
        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
