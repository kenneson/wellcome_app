import { EventRegistrationRepository } from '../../domain/repositories/EventRegistrationRepository';
import { PaymentRepository } from '../../domain/repositories/PaymentRepository';
import { EventRegistration } from '../../domain/entities/EventRegistration';
import { PaymentGateway } from '../../domain/services/PaymentGateway';
import { SendNotificationUseCase } from './SendNotificationUseCase';
import { NotificationType } from '../../domain/value-objects/NotificationType';
import { PaymentStatus } from '../../domain/value-objects/PaymentStatus';

export class RejectRegistrationUseCase {
    constructor(
        private eventRegistrationRepository: EventRegistrationRepository,
        private sendNotificationUseCase: SendNotificationUseCase,
        private paymentRepository: PaymentRepository,
        private paymentGateway: PaymentGateway
    ) { }

    async execute(registrationId: string, hostId: string, reason: string): Promise<EventRegistration> {
        const registration = await this.eventRegistrationRepository.findById(registrationId);

        if (!registration) {
            throw new Error('Registration not found');
        }

        if (registration.event && registration.event.hostId !== hostId) {
            throw new Error('Unauthorized: You are not the host of this event');
        }

        if (registration.event && new Date(registration.event.eventDate) < new Date()) {
            throw new Error('Cannot change registration status for past events');
        }

        const payment = await this.paymentRepository.findByBookingId(registrationId);
        if (payment?.status === PaymentStatus.CONFIRMED) {
            if (!payment.providerPaymentId) {
                throw new Error('Cannot reject a paid registration without provider payment reference');
            }

            await this.paymentGateway.refundPayment(
                payment.providerPaymentId,
                payment.valor,
                reason || 'Inscricao recusada pelo anfitriao'
            );
        } else if (payment?.status === PaymentStatus.PENDING) {
            await this.cancelPendingProviderPayment(payment);
        }

        const updatedRegistration = await this.eventRegistrationRepository.updateStatus(registrationId, 'REJECTED', reason, hostId);

        if (updatedRegistration.user) {
            const eventTitle = updatedRegistration.event?.title || 'Evento';
            const refundMessage = payment?.status === PaymentStatus.CONFIRMED
                ? ' O estorno do pagamento foi solicitado.'
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

        return updatedRegistration;
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
