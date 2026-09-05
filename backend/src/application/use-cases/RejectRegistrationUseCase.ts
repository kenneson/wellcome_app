import { EventRegistrationRepository } from '../../domain/repositories/EventRegistrationRepository';
import { PaymentRepository } from '../../domain/repositories/PaymentRepository';
import { EventRegistration } from '../../domain/entities/EventRegistration';
import { PaymentGateway } from '../../domain/services/PaymentGateway';
import { SendNotificationUseCase } from './SendNotificationUseCase';
import { NotificationType } from '../../domain/value-objects/NotificationType';
import { PaymentStatus } from '../../domain/value-objects/PaymentStatus';
import { ChatService } from '../services/ChatService';
import { RegistrationRefundService } from '../services/RegistrationRefundService';

export class RejectRegistrationUseCase {
    constructor(
        private eventRegistrationRepository: EventRegistrationRepository,
        private sendNotificationUseCase: SendNotificationUseCase,
        private paymentRepository: PaymentRepository,
        private paymentGateway: PaymentGateway,
        private chatService?: ChatService,
        private refundService?: RegistrationRefundService
    ) { }

    async execute(registrationId: string, hostId: string, reason: string): Promise<EventRegistration> {
        const registration = await this.eventRegistrationRepository.findById(registrationId);

        if (!registration) {
            throw new Error('Registration not found');
        }

        if (!registration.event || registration.event.hostId !== hostId) {
            throw new Error('Unauthorized: You are not the host of this event');
        }

        if (registration.event && new Date(registration.event.eventDate) < new Date()) {
            throw new Error('Cannot change registration status for past events');
        }

        const payment = await this.paymentRepository.findByBookingId(registrationId);
        const updatedRegistration = this.eventRegistrationRepository.rejectWithGuard
            ? await this.eventRegistrationRepository.rejectWithGuard(registrationId, hostId, reason)
            : await this.eventRegistrationRepository.updateStatus(registrationId, 'REJECTED', reason, hostId);
        await this.eventRegistrationRepository.reconcileEventCapacity?.(registration.eventId);

        if (payment && [PaymentStatus.CONFIRMED, PaymentStatus.PARTIALLY_REFUNDED].includes(payment.status)) {
            // Rejection is durable before contacting the provider. The worker retries failures.
            if (!this.refundService) throw new Error('Automatic refund service unavailable');
            await this.refundService.execute(payment.id).catch((error) =>
                console.error('Rejection saved; automatic refund pending', { paymentId: payment.id, error })
            );
        } else if (payment?.status === PaymentStatus.PENDING) {
            await this.cancelPendingProviderPayment(payment).catch((error) =>
                console.error('Rejection saved; provider cancellation pending', { paymentId: payment.id, error })
            );
        }

        if (updatedRegistration.user) {
            const eventTitle = updatedRegistration.event?.title || 'Evento';
            const refundMessage = payment && [PaymentStatus.CONFIRMED, PaymentStatus.PARTIALLY_REFUNDED].includes(payment.status)
? ' A vaga foi liberada e a devolução integral está em processamento.'
                : '';

            await this.sendNotificationUseCase.execute(
                updatedRegistration.user.id,
                updatedRegistration.user.expoPushToken || null,
                'Inscricao recusada',
                `Sua inscricao para "${eventTitle}" nao foi aceita.${reason ? ` Motivo: ${reason}` : ''}${refundMessage}`,
                NotificationType.REGISTRATION_REJECTED,
                { eventId: updatedRegistration.eventId }
            );
        }

        await this.chatService?.recordRegistrationRejected(registrationId, reason).catch((error) =>
            console.error('Failed to record rejection in chat', error)
        );
        return await this.eventRegistrationRepository.findById(registrationId) || updatedRegistration;
    }

    private async cancelPendingProviderPayment(payment: { providerPaymentId?: string; checkoutUrl?: string; txid: string }): Promise<void> {
        if (payment.providerPaymentId) {
            await this.paymentGateway.deletePayment(payment.providerPaymentId);
            return;
        }

        if (payment.checkoutUrl) {
            await this.paymentGateway.cancelCheckout(payment.txid);
        }
    }
}
