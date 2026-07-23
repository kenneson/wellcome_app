import { PaymentStatus } from '../value-objects/PaymentStatus';

export interface Payment {
    id: string;
    bookingId: string;
    eventId: string;
    userId: string;
    txid: string;
    pixCopiaECola: string;
    qrcode: string;
    valor: number;
    status: PaymentStatus;
    paidAt?: Date;
    platformFee?: number;
    netAmount?: number;
    createdAt: Date;
    updatedAt: Date;
}
