export interface WithdrawalRequest {
    id: string;
    userId: string;
    amount: number;
    pixKey: string;
    pixKeyType: string | null;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    efiEndToEndId?: string | null;
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
    
    findById(id: string): Promise<WithdrawalRequest | null>;
    
    updateStatus(id: string, status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED', efiEndToEndId?: string): Promise<WithdrawalRequest>;
    
    findByUserId(userId: string): Promise<WithdrawalRequest[]>;

    findAll(): Promise<WithdrawalRequest[]>;
}
