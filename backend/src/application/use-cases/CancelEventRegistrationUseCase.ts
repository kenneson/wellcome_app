import { EventRegistrationRepository } from '../../domain/repositories/EventRegistrationRepository';
import { EventRepository } from '../../domain/repositories/EventRepository';
import { SendNotificationUseCase } from './SendNotificationUseCase';
import { NotificationType } from '../../domain/value-objects/NotificationType';
import { PaymentRepository } from '../../domain/repositories/PaymentRepository';
import { PaymentGateway } from '../../domain/services/PaymentGateway';
import { PaymentStatus } from '../../domain/value-objects/PaymentStatus';
import { ChatService } from '../services/ChatService';
import { RegistrationRefundService } from '../services/RegistrationRefundService';
import { participantPenaltyRate, participantRefundTarget } from '../../domain/services/CancellationPolicy';

export class CancelEventRegistrationUseCase {
    constructor(
        private eventRegistrationRepository: EventRegistrationRepository,
        private eventRepository: EventRepository,
        private sendNotificationUseCase: SendNotificationUseCase,
        private paymentRepository: PaymentRepository,
        private paymentGateway: PaymentGateway,
        private chatService?: ChatService,
        private refundService?: RegistrationRefundService
    ) { }

    async execute(eventId: string, userId: string): Promise<void> {
        // Fetch event to get host token
        const event = await this.eventRepository.findById(eventId);

        if (event && new Date(event.eventDate) < new Date()) {
            throw new Error('Cannot cancel registration for past events');
        }

        const registrations = await this.eventRegistrationRepository.findByUserId(userId);
        const registration = registrations.find(r => r.eventId === eventId);
        if (!registration || registration.status === 'CANCELLED' || registration.status === 'REJECTED') {
            return;
        }
        if (!this.eventRegistrationRepository.cancelByParticipant) throw new Error('Cancellation unavailable');
        const userName = registration?.user?.fullName || 'Um participante';

        const payment = await this.paymentRepository.findByBookingId(registration.id);
        let refundRequested = false;

        if (
            payment
            && [PaymentStatus.CONFIRMED, PaymentStatus.PARTIALLY_REFUNDED].includes(payment.status)
        ) {
            if (!this.refundService) throw new Error('Automatic refund service unavailable');
            // The penalty protects hosts from late drop-outs of confirmed guests only.
            const penaltyRate = registration.status === 'APPROVED' && event
                ? participantPenaltyRate(event.eventDate)
                : 0;
            const refundTargetAmount = participantRefundTarget(payment.valor, payment.refundedAmount || 0, penaltyRate);
            await this.eventRegistrationRepository.cancelByParticipant(registration.id, {
                penaltyRate,
                refundTargetAmount,
                refundReason: penaltyRate > 0
                    ? `Inscricao cancelada pelo participante com menos de 7 dias. Multa de ${penaltyRate * 100}%.`
                    : 'Inscricao cancelada pelo participante. Devolucao integral.',
            });
            refundRequested = refundTargetAmount > (payment.refundedAmount || 0);
            // Cancellation is durable before contacting the provider. The worker retries failures.
            await this.refundService.execute(payment.id).catch((error) =>
                console.error('Cancellation saved; automatic refund pending', { paymentId: payment.id, error })
            );
        } else {
            if (payment?.status === PaymentStatus.PENDING) {
                await this.cancelPendingProviderPayment(payment);
                await this.paymentRepository.updateStatus(payment.id, PaymentStatus.EXPIRED);
            }
            await this.eventRegistrationRepository.cancelByParticipant(registration.id, {});
        }

        await this.eventRegistrationRepository.reconcileEventCapacity?.(eventId);

        if (event && event.host) {
            await this.sendNotificationUseCase.execute(
                event.host.id,
                event.host.expoPushToken || null,
                'Cancelamento de Inscrição',
                `${userName} cancelou a inscrição no evento "${event.title}".`,
                NotificationType.PARTICIPANT_CANCELED,
                { eventId: event.id, refundRequested }
            );
        }

        await this.chatService?.recordRegistrationCancelled(registration.id, refundRequested).catch((error) =>
            console.error('Failed to record cancellation in chat', error)
        );
    }

    private async cancelPendingProviderPayment(payment: {
        providerPaymentId?: string;
        checkoutUrl?: string;
        txid: string;
    }): Promise<void> {
        if (payment.providerPaymentId) {
            await this.paymentGateway.deletePayment(payment.providerPaymentId);
            return;
        }

        if (payment.checkoutUrl) {
            await this.paymentGateway.cancelCheckout(payment.txid);
        }
    }
}
