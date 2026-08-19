import { Payment } from '../../domain/entities/Payment';
import { EventRepository } from '../../domain/repositories/EventRepository';
import { PaymentRepository } from '../../domain/repositories/PaymentRepository';
import { EventAccessType } from '../../domain/value-objects/EventAccessType';
import { NotificationType } from '../../domain/value-objects/NotificationType';
import { PaymentStatus } from '../../domain/value-objects/PaymentStatus';
import { EfiPixService } from '../../infrastructure/external/EfiPixService';
import { SendNotificationUseCase } from './SendNotificationUseCase';

export interface CheckPixPaymentResult {
    paymentId: string;
    txid: string;
    status: string;
    paid: boolean;
}

export class CheckPixPaymentUseCase {
    constructor(
        private efiPixService: EfiPixService,
        private paymentRepository: PaymentRepository,
        private eventRepository: EventRepository,
        private sendNotificationUseCase: SendNotificationUseCase
    ) {}

    async execute(bookingId: string, userId: string): Promise<CheckPixPaymentResult> {
        const payment = await this.paymentRepository.findByBookingId(bookingId);
        if (!payment) {
            throw new Error('Payment not found for this booking');
        }

        if (payment.userId !== userId) {
            throw new Error('Payment does not belong to this user');
        }

        return this.checkPayment(payment);
    }

    async executeByTxid(txid: string): Promise<CheckPixPaymentResult> {
        const payment = await this.paymentRepository.findByTxid(txid);
        if (!payment) {
            throw new Error('Payment not found for this transaction');
        }

        return this.checkPayment(payment);
    }

    private async checkPayment(payment: Payment): Promise<CheckPixPaymentResult> {
        if (payment.status === PaymentStatus.CONFIRMED) {
            return {
                paymentId: payment.id,
                txid: payment.txid,
                status: PaymentStatus.CONFIRMED,
                paid: true,
            };
        }

        const efiStatus = await this.efiPixService.getChargeStatus(payment.txid);
        let newStatus: PaymentStatus = payment.status;
        let paid = false;

        if (efiStatus.status === 'CONCLUIDA') {
            const event = await this.eventRepository.findById(payment.eventId);
            if (!event?.hostId) {
                throw new Error('Event host not found');
            }

            const feePercentage = Number(process.env.APP_FEE_PERCENTAGE || '10') / 100;
            const platformFee = Number((payment.valor * feePercentage).toFixed(2));
            const netAmount = Number((payment.valor - platformFee).toFixed(2));
            const confirmed = await this.paymentRepository.confirmAndCreditHost({
                paymentId: payment.id,
                bookingId: payment.bookingId,
                hostId: event.hostId,
                platformFee,
                netAmount,
                paidAt: new Date(),
                approveBookingOnPayment: event.accessType === EventAccessType.OPEN && !event.requiresApproval,
            });

            newStatus = PaymentStatus.CONFIRMED;
            paid = true;

            if (confirmed && event.host) {
                await this.sendNotificationUseCase.execute(
                    event.host.id,
                    event.host.expoPushToken || null,
                    'Pagamento confirmado',
                    `Um participante confirmou o pagamento para "${event.title}".`,
                    NotificationType.NEW_REGISTRATION_CONFIRMED,
                    { eventId: event.id }
                );
            }
        } else if (
            efiStatus.status === 'REMOVIDA_PELO_USUARIO_RECEBEDOR' ||
            efiStatus.status === 'REMOVIDA_PELO_PSP'
        ) {
            newStatus = PaymentStatus.EXPIRED;
            await this.paymentRepository.updateStatus(payment.id, PaymentStatus.EXPIRED);
        }

        return {
            paymentId: payment.id,
            txid: payment.txid,
            status: newStatus,
            paid,
        };
    }
}
