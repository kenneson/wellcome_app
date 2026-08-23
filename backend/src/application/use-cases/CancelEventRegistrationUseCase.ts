import { EventRegistrationRepository } from '../../domain/repositories/EventRegistrationRepository';
import { EventRepository } from '../../domain/repositories/EventRepository';
import { SendNotificationUseCase } from './SendNotificationUseCase';
import { NotificationType } from '../../domain/value-objects/NotificationType';
import { PaymentRepository } from '../../domain/repositories/PaymentRepository';
import { PaymentGateway } from '../../domain/services/PaymentGateway';
import { PaymentStatus } from '../../domain/value-objects/PaymentStatus';

export class CancelEventRegistrationUseCase {
    constructor(
        private eventRegistrationRepository: EventRegistrationRepository,
        private eventRepository: EventRepository,
        private sendNotificationUseCase: SendNotificationUseCase,
        private paymentRepository: PaymentRepository,
        private paymentGateway: PaymentGateway
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
        const userName = registration?.user?.fullName || 'Um participante';

        const payment = await this.paymentRepository.findByBookingId(registration.id);
        let refundRequested = false;

        if (
            payment
            && [PaymentStatus.CONFIRMED, PaymentStatus.PARTIALLY_REFUNDED].includes(payment.status)
        ) {
            if (!payment.providerPaymentId) {
                throw new Error('Cannot cancel a paid registration without provider payment reference');
            }

            const refundableAmount = Number(
                Math.max(0, payment.valor - Number(payment.refundedAmount || 0)).toFixed(2)
            );
            if (refundableAmount > 0) {
                await this.paymentGateway.refundPayment(
                    payment.providerPaymentId,
                    refundableAmount,
                    'Inscricao cancelada pelo participante'
                );
                refundRequested = true;
            }
        } else if (payment?.status === PaymentStatus.PENDING) {
            await this.cancelPendingProviderPayment(payment);
            await this.paymentRepository.updateStatus(payment.id, PaymentStatus.EXPIRED);
        }

        await this.eventRegistrationRepository.updateStatus(registration.id, 'CANCELLED');
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
