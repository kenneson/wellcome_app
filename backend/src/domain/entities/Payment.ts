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
    netAmount?: number;
    refundedAmount?: number;
    refundedNetAmount?: number;
    createdAt: Date;
    updatedAt: Date;
}
