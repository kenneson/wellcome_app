import { EventRegistrationRepository } from '../../domain/repositories/EventRegistrationRepository';
import { PaymentRepository } from '../../domain/repositories/PaymentRepository';
import { EventRegistration } from '../../domain/entities/EventRegistration';
import { SendNotificationUseCase } from './SendNotificationUseCase';
import { NotificationType } from '../../domain/value-objects/NotificationType';
import { PaymentStatus } from '../../domain/value-objects/PaymentStatus';
import { calculateHostFundsAvailableAt } from '../../domain/services/HostFundsAvailabilityPolicy';
import { EventRepository } from '../../domain/repositories/EventRepository';
import {
    registrationHoldsCapacity,
} from '../../domain/services/RegistrationPaymentPolicy';
import { ChatService } from '../services/ChatService';

export class ApproveRegistrationUseCase {
    constructor(
        private eventRegistrationRepository: EventRegistrationRepository,
        private sendNotificationUseCase: SendNotificationUseCase,
        private paymentRepository: PaymentRepository,
        private eventRepository: EventRepository,
        private chatService?: ChatService
    ) { }

    async execute(registrationId: string, hostId: string): Promise<EventRegistration> {
        const registration = await this.eventRegistrationRepository.findById(registrationId);

        if (!registration) {
            throw new Error('Registration not found');
        }

        const event = await this.eventRepository.findById(registration.eventId);
        if (!event) {
            throw new Error('Event not found');
        }

        if (event.hostId !== hostId) {
            throw new Error('Unauthorized: You are not the host of this event');
        }

        if (new Date(event.eventDate) < new Date()) {
            throw new Error('Cannot change registration status for past events');
        }

        if (registration.status === 'APPROVED') {
            return registration;
        }
        if (registration.status !== 'PENDING') {
            throw new Error('A inscrição não está aguardando aprovação');
        }

        if (!this.eventRegistrationRepository.approveWithCapacityGuard) {
            const occupiedSpots = (event.bookings ?? []).filter((booking) =>
                booking.id !== registration.id && registrationHoldsCapacity(event, booking)
            ).length;
            if (event.maxGuests && occupiedSpots >= event.maxGuests) {
                throw new Error('Event is full');
            }
        }

        const payment = await this.paymentRepository.findByBookingId(registrationId);
        const isPaidEvent = Number(event.price || 0) > 0 || Boolean(payment);
        const paymentConfirmed = payment?.status === PaymentStatus.CONFIRMED
            || payment?.status === PaymentStatus.PARTIALLY_REFUNDED;
        if (isPaidEvent && !paymentConfirmed) {
            throw new Error('Aguarde a confirmação do pagamento para aprovar a inscrição');
        }
        const paymentDueAt = null;

        const updatedRegistration = this.eventRegistrationRepository.approveWithCapacityGuard
            ? await this.eventRegistrationRepository.approveWithCapacityGuard(
                registrationId,
                event.id,
                hostId,
                paymentDueAt
            )
            : await this.eventRegistrationRepository.updateStatus(
                registrationId,
                'APPROVED',
                undefined,
                hostId,
                paymentDueAt
            );

        if (!updatedRegistration) throw new Error('Event is full');

        if (paymentConfirmed && payment) {
            await this.paymentRepository.holdHostFunds({
                paymentId: payment.id,
                hostId,
                fundsAvailableAt: calculateHostFundsAvailableAt(event),
            });
        }

        if (updatedRegistration.user) {
            const eventTitle = event.title || 'Evento';
            const title = 'Inscricao aprovada!';
            const body = `Sua presenca em "${eventTitle}" foi confirmada.`;

            await this.sendNotificationUseCase.execute(
                updatedRegistration.user.id,
                updatedRegistration.user.expoPushToken || null,
                title,
                body,
                NotificationType.REGISTRATION_APPROVED,
                { eventId: updatedRegistration.eventId }
            );
        }

        await this.chatService?.recordRegistrationApproved(registrationId).catch((error) =>
            console.error('Failed to record approval in chat', error)
        );
        return updatedRegistration;
    }
}
