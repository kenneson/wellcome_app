import { PaymentRepository } from '../../domain/repositories/PaymentRepository';
import { PaymentStatus } from '../../domain/value-objects/PaymentStatus';

export interface CheckPaymentResult {
    paymentId: string;
    checkoutId: string;
    checkoutUrl?: string;
    status: string;
    paid: boolean;
}

export class CheckPaymentUseCase {
    constructor(private paymentRepository: PaymentRepository) {}

    async execute(bookingId: string, userId: string): Promise<CheckPaymentResult> {
        const payment = await this.paymentRepository.findByBookingId(bookingId);
        if (!payment) throw new Error('Payment not found for this booking');
        if (payment.userId !== userId) {
            throw new Error('Payment does not belong to this user');
        }

        return {
            paymentId: payment.id,
            checkoutId: payment.txid,
            checkoutUrl: payment.checkoutUrl,
            status: payment.status,
            paid:
                payment.status === PaymentStatus.CONFIRMED ||
                payment.status === PaymentStatus.PARTIALLY_REFUNDED,
        };
    }
}
