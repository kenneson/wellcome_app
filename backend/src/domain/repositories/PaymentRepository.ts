import { Payment } from '../entities/Payment';

export interface PaymentRepository {
    create(data: {
        bookingId: string;
        eventId: string;
        userId: string;
        txid: string;
        pixCopiaECola: string;
        qrcode: string;
        valor: number;
    }): Promise<Payment>;

    findByBookingId(bookingId: string): Promise<Payment | null>;
    findByTxid(txid: string): Promise<Payment | null>;
    updateStatus(id: string, status: string, paidAt?: Date, platformFee?: number, netAmount?: number): Promise<Payment>;
}
