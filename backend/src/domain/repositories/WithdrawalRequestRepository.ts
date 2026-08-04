export interface WithdrawalRequest {
    id: string;
    userId: string;
    userName?: string | null;
    userAvatarUrl?: string | null;
    amount: number;
    pixKey: string;
    pixKeyType: string | null;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    efiEndToEndId?: string | null;
    provider: string;
    providerTransferId?: string | null;
    providerEndToEndId?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface WithdrawalRequestRepository {
    create(data: {
        userId: string;
        amount: number;
        pixKey: string;
        pixKeyType?: string | null;
    }): Promise<WithdrawalRequest>;

    createWithBalanceReservation(data: {
        userId: string;
        amount: number;
        pixKey: string;
        pixKeyType?: string | null;
    }): Promise<WithdrawalRequest>;
    
    findById(id: string): Promise<WithdrawalRequest | null>;
    
    updateStatus(id: string, status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED', efiEndToEndId?: string): Promise<WithdrawalRequest>;

    markSubmitted(data: {
        id: string;
        providerTransferId: string;
        providerEndToEndId?: string | null;
        status: 'PROCESSING' | 'COMPLETED';
    }): Promise<WithdrawalRequest>;

    completeByProviderTransferId(providerTransferId: string, providerEndToEndId?: string): Promise<boolean>;
    failAndRefundByProviderTransferId(providerTransferId: string): Promise<boolean>;
    failAndRefund(id: string): Promise<boolean>;

    claimPending(id: string): Promise<WithdrawalRequest | null>;
    
    findByUserId(userId: string): Promise<WithdrawalRequest[]>;

    findAll(): Promise<WithdrawalRequest[]>;
}
