import { EventRegistration } from '../../domain/entities/EventRegistration';
import { EventRegistrationRepository } from '../../domain/repositories/EventRegistrationRepository';
import { EventRepository } from '../../domain/repositories/EventRepository';
import { EventAccessType } from '../../domain/value-objects/EventAccessType';
import { NotificationType } from '../../domain/value-objects/NotificationType';
import { RegistrationStatus } from '../../domain/value-objects/RegistrationStatus';
import { SendNotificationUseCase } from './SendNotificationUseCase';
import { isEventOpenForRegistration } from '../../domain/services/EventAvailability';
import {
    calculateRegistrationPaymentDueAt,
    eventRequiresHostApproval,
    registrationHoldsCapacity,
} from '../../domain/services/RegistrationPaymentPolicy';

export interface JoinEventDTO {
    eventId: string;
    userId: string;
    answers?: { questionId: string; answer: string }[];
}

export class JoinEventUseCase {
    constructor(
        private eventRegistrationRepository: EventRegistrationRepository,
        private eventRepository: EventRepository,
        private sendNotificationUseCase: SendNotificationUseCase
    ) { }

    async execute(data: JoinEventDTO): Promise<EventRegistration> {
        const event = await this.eventRepository.findById(data.eventId);

        if (!event) {
            throw new Error('Event not found');
        }

        if (!isEventOpenForRegistration(event)) {
            throw new Error('Registration deadline has passed');
        }

        if (event.hostId === data.userId) {
            throw new Error('Host cannot join their own event');
        }

        await this.eventRegistrationRepository.reconcileEventCapacity?.(data.eventId);

        const existingRegistrations = await this.eventRegistrationRepository.findByUserId(data.userId);
        const existingForEvent = existingRegistrations.find(r => r.eventId === data.eventId);

        if (existingForEvent) {
            if (
                existingForEvent.status === RegistrationStatus.REJECTED ||
                existingForEvent.status === RegistrationStatus.CANCELLED ||
                existingForEvent.status === RegistrationStatus.EXPIRED
            ) {
                await this.eventRegistrationRepository.deleteByEventAndUser(data.eventId, data.userId);
            } else {
                return existingForEvent;
            }
        }

        let registration: EventRegistration;
        if (this.eventRegistrationRepository.createWithCapacityGuard) {
            registration = await this.eventRegistrationRepository.createWithCapacityGuard({
                eventId: data.eventId,
                userId: data.userId,
                answers: data.answers,
            });
        } else {
            const reservedBookings = event.bookings?.filter((booking) =>
                registrationHoldsCapacity(event, booking)
            ) || [];
            const isFull = Boolean(event.maxGuests && reservedBookings.length >= event.maxGuests);

            if (isFull && !event.allowWaitlist) throw new Error('Event is full');

            let initialStatus = RegistrationStatus.PENDING;
            if (isFull && event.allowWaitlist) initialStatus = RegistrationStatus.WAITLIST;
            else if (Number(event.price) <= 0 && event.accessType === EventAccessType.OPEN) {
                initialStatus = RegistrationStatus.APPROVED;
            }

            registration = await this.eventRegistrationRepository.create({
                eventId: data.eventId,
                userId: data.userId,
                status: initialStatus,
                paymentDueAt:
                    Number(event.price) > 0
                    && initialStatus === RegistrationStatus.PENDING
                    && !eventRequiresHostApproval(event)
                        ? calculateRegistrationPaymentDueAt(event)
                        : null,
                answers: data.answers,
            });
        }

        const initialStatus = registration.status;

        // Notify host about the candidate. Paid events still require host approval before final confirmation.
        if (event.host) {
            const isPending = initialStatus === RegistrationStatus.PENDING;
            const notificationTitle = isPending ? 'Solicitação de inscrição!' : 'Nova inscrição confirmada!';
            const notificationBody = isPending
                ? `Alguém quer participar do seu evento "${event.title}" e aguarda aprovação.`
                : `Alguém se inscreveu no seu evento "${event.title}"!`;
            const notificationType = isPending ? NotificationType.NEW_REGISTRATION_PENDING : NotificationType.NEW_REGISTRATION_CONFIRMED;

            await this.sendNotificationUseCase.execute(
                event.host.id,
                event.host.expoPushToken || null,
                notificationTitle,
                notificationBody,
                notificationType,
                { eventId: event.id }
            );
        }

        return registration;
    }
}
