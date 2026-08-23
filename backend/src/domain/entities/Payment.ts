import { PaymentStatus } from '../value-objects/PaymentStatus';

export interface Payment {
    id: string;
    bookingId: string;
    eventId: string;
    userId: string;
    txid: string;
    pixCopiaECola: string;
    qrcode: string;
    pixExpirationDate?: Date;
    provider?: string;
    checkoutUrl?: string;
    providerPaymentId?: string;
    paymentMethod?: string;
    providerStatus?: string;
    valor: number;
    status: PaymentStatus;
    paidAt?: Date;
    platformFee?: number;
    processorFee?: number;
    processorFeePayer?: 'PLATFORM' | 'HOST';
    platformMargin?: number;
    refundedPlatformFee?: number;
    refundedProcessorFee?: number;
    netAmount?: number;
    refundedAmount?: number;
    refundedNetAmount?: number;
    fundsHeldAt?: Date;
    fundsAvailableAt?: Date;
    fundsReleasedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
