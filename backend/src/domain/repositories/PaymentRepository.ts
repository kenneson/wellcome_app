import { Payment } from '../entities/Payment';

export interface PaymentRepository {
    listRefundCandidates?(): Promise<Payment[]>;
    withRegistrationRefundLock?<T>(paymentId: string, action: (payment: Payment) => Promise<T>): Promise<T | null>;
    create(data: {
        bookingId: string;
        eventId: string;
        userId: string;
        txid: string;
        pixCopiaECola: string;
        qrcode: string;
        valor: number;
        provider?: string;
        providerStatus?: string;
    }): Promise<Payment>;

    findByBookingId(bookingId: string): Promise<Payment | null>;
    findByTxid(txid: string): Promise<Payment | null>;
    findByProviderPaymentId(providerPaymentId: string): Promise<Payment | null>;
    resetForProviderPayment(id: string): Promise<boolean>;
    claimProviderPaymentCreation(id: string, value: number): Promise<boolean>;
    saveProviderPayment(data: {
        paymentId: string;
        providerPaymentId: string;
        providerStatus: string;
        value: number;
    }): Promise<Payment>;
    savePixData(data: {
        paymentId: string;
        payload: string;
        expirationDate: Date;
    }): Promise<Payment>;
    claimCardPaymentAttempt(paymentId: string, providerPaymentId: string): Promise<boolean>;
    claimCheckoutCreation(id: string, value: number): Promise<boolean>;
    saveCheckout(data: {
        paymentId: string;
        checkoutId: string;
        checkoutUrl: string;
        providerStatus: string;
    }): Promise<Payment>;
    markCheckoutCreationFailed(id: string): Promise<void>;
    updateProviderPayment(data: {
        paymentId: string;
        providerPaymentId: string;
        paymentMethod: string;
        providerStatus: string;
    }): Promise<Payment>;
    expirePendingByTxid(txid: string, providerStatus: string): Promise<boolean>;
    updateStatus(id: string, status: string, paidAt?: Date, platformFee?: number, netAmount?: number): Promise<Payment>;
    confirmAndHoldHostFunds(data: {
        paymentId: string;
        bookingId: string;
        hostId: string;
        platformFee: number;
        processorFee?: number;
        processorFeePayer?: 'PLATFORM' | 'HOST';
        platformMargin?: number;
        netAmount: number;
        paidAt: Date;
        providerStatus?: string;
        approveBookingOnPayment?: boolean;
        fundsAvailableAt: Date;
    }): Promise<boolean>;
    holdHostFunds(data: {
        paymentId: string;
        hostId: string;
        fundsAvailableAt: Date;
    }): Promise<boolean>;
    releaseMaturedHostFunds(hostId: string, now?: Date): Promise<number>;
    applyRefund(data: {
        paymentId: string;
        hostId: string;
        refundedAmount: number;
        targetStatus: 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'CHARGEBACK';
        providerStatus: string;
        referenceId: string;
    }): Promise<boolean>;
    listSettledForEconomics?(limit?: number): Promise<Payment[]>;
}
