import { EventRegistrationRepository } from '../../domain/repositories/EventRegistrationRepository';
import { PaymentRepository } from '../../domain/repositories/PaymentRepository';
import { EventRegistration } from '../../domain/entities/EventRegistration';
import { SendNotificationUseCase } from './SendNotificationUseCase';
import { NotificationType } from '../../domain/value-objects/NotificationType';
import { PaymentStatus } from '../../domain/value-objects/PaymentStatus';

export class ApproveRegistrationUseCase {
    constructor(
        private eventRegistrationRepository: EventRegistrationRepository,
        private sendNotificationUseCase: SendNotificationUseCase,
        private paymentRepository: PaymentRepository
    ) { }

    async execute(registrationId: string, hostId: string): Promise<EventRegistration> {
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
        const isPaidEvent = Number(registration.event?.price || 0) > 0 || Boolean(payment);
        const paymentConfirmed = payment?.status === PaymentStatus.CONFIRMED;

        const updatedRegistration = await this.eventRegistrationRepository.updateStatus(
            registrationId,
            'APPROVED',
            undefined,
            hostId
        );

        if (paymentConfirmed && payment) {
            await this.paymentRepository.releaseHostCredit({
                paymentId: payment.id,
                hostId,
            });
        }

        if (updatedRegistration.user) {
            const eventTitle = updatedRegistration.event?.title || 'Evento';
            const title = paymentConfirmed || !isPaidEvent
                ? 'Inscricao aprovada!'
                : 'Inscricao aprovada, pagamento pendente';
            const body = paymentConfirmed || !isPaidEvent
                ? `Sua presenca em "${eventTitle}" foi confirmada.`
                : `Sua inscricao em "${eventTitle}" foi aprovada. Conclua o pagamento para confirmar sua presenca.`;

            await this.sendNotificationUseCase.execute(
                updatedRegistration.user.id,
                updatedRegistration.user.expoPushToken || null,
                title,
                body,
                NotificationType.REGISTRATION_APPROVED,
                { eventId: updatedRegistration.eventId }
            );
        }

        return updatedRegistration;
    }
}
