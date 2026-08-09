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
    providerStatus?: string | null;
    approvedByAdminId?: string | null;
    submissionAttempts: number;
    failureReason?: string | null;
    approvedAt?: Date | null;
    submittedAt?: Date | null;
    completedAt?: Date | null;
    failedAt?: Date | null;
    lastReconciledAt?: Date | null;
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
        providerStatus?: string;
        status: 'PROCESSING' | 'COMPLETED';
    }): Promise<WithdrawalRequest>;

    markSubmissionUncertain(id: string, reason: string): Promise<WithdrawalRequest>;
    recordProviderProcessing(data: {
        providerTransferId: string;
        externalReference?: string | null;
        providerStatus: string;
        providerEndToEndId?: string | null;
    }): Promise<boolean>;
    completeByProviderTransferId(
        providerTransferId: string,
        providerEndToEndId?: string,
        externalReference?: string | null
    ): Promise<boolean>;
    failAndRefundByProviderTransferId(
        providerTransferId: string,
        externalReference?: string | null,
        reason?: string
    ): Promise<boolean>;
    failAndRefund(id: string, reason?: string): Promise<boolean>;

    claimPending(id: string, approvedByAdminId: string): Promise<WithdrawalRequest | null>;
    
    findByUserId(userId: string): Promise<WithdrawalRequest[]>;

    findAll(): Promise<WithdrawalRequest[]>;
}
