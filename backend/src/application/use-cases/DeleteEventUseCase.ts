import { EventRepository } from '../../domain/repositories/EventRepository';
import { EventRegistrationRepository } from '../../domain/repositories/EventRegistrationRepository';
import { PaymentRepository } from '../../domain/repositories/PaymentRepository';
import { PaymentGateway } from '../../domain/services/PaymentGateway';
import { NotificationType } from '../../domain/value-objects/NotificationType';
import { PaymentStatus } from '../../domain/value-objects/PaymentStatus';
import { ChatService } from '../services/ChatService';
import { RegistrationRefundService } from '../services/RegistrationRefundService';
import { SendNotificationUseCase } from './SendNotificationUseCase';

export interface DeleteEventResult {
    outcome: 'DELETED' | 'CANCELLED';
    cancellationFee: number;
}

/** Events without history are deleted; events with history are cancelled and refunded in full. */
export class DeleteEventUseCase {
    constructor(
        private eventRepository: EventRepository,
        private eventRegistrationRepository: EventRegistrationRepository,
        private chatService?: ChatService,
        private cancellation?: {
            payments: PaymentRepository;
            gateway: PaymentGateway;
            refunds: RegistrationRefundService;
            notifications: SendNotificationUseCase;
        }
    ) { }

    async execute(eventId: string, hostId: string, reason = 'Evento cancelado pelo anfitriao'): Promise<DeleteEventResult> {
        const event = await this.eventRepository.findById(eventId);
        if (!event) {
            throw new Error('Event not found');
        }

        if (event.hostId !== hostId) {
            throw new Error('Only the host can delete this event');
        }

        const registrations = await this.eventRegistrationRepository.findByEventIdWithUser(eventId);
        if (registrations.length === 0 && !(await this.chatService?.hasEventHistory(eventId))) {
            await this.eventRepository.delete(eventId);
            return { outcome: 'DELETED', cancellationFee: 0 };
        }

        if (!this.eventRepository.cancelByHost || !this.cancellation) throw new Error('Event cancellation unavailable');
        const { payments, gateway, refunds, notifications } = this.cancellation;
        const result = await this.eventRepository.cancelByHost(eventId, hostId, reason);

        // Everything below is retried or harmless if it fails: the refund worker picks up
        // cancelled paid bookings, and late payments on cancelled bookings are refunded in full.
        for (const paymentId of result.refundPaymentIds) {
            await refunds.execute(paymentId).catch((error) =>
                console.error('Event cancelled; automatic refund pending', { paymentId, error }));
        }
        for (const payment of result.pendingPayments) {
            await (payment.providerPaymentId
                ? gateway.deletePayment(payment.providerPaymentId)
                : payment.checkoutUrl ? gateway.cancelCheckout(payment.txid) : Promise.resolve())
                .then(() => payments.updateStatus(payment.id, PaymentStatus.EXPIRED))
                .catch((error) => console.error('Event cancelled; provider cancellation pending', { paymentId: payment.id, error }));
        }
        for (const user of result.notifyUsers) {
            await notifications.execute(
                user.id,
                user.expoPushToken,
                'Evento cancelado',
                `O evento "${event.title}" foi cancelado pelo anfitrião. Se você pagou, a devolução integral está em processamento.`,
                NotificationType.EVENT_CANCELED,
                { eventId }
            ).catch((error) => console.error('Failed to notify event cancellation', { userId: user.id, error }));
        }

        return { outcome: 'CANCELLED', cancellationFee: result.feeTotal };
    }
}
