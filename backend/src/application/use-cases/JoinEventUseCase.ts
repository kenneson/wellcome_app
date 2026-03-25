import { EventRegistration } from '../../domain/entities/EventRegistration';
import { EventRegistrationRepository } from '../../domain/repositories/EventRegistrationRepository';
import { EventRepository } from '../../domain/repositories/EventRepository';
import { EventAccessType } from '../../domain/value-objects/EventAccessType';
import { NotificationType } from '../../domain/value-objects/NotificationType';
import { RegistrationStatus } from '../../domain/value-objects/RegistrationStatus';
import { SendNotificationUseCase } from './SendNotificationUseCase';

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

        // Check if registration is still open
        const now = new Date();
        const cutoffDate = event.reservationDeadline
            ? new Date(event.reservationDeadline)
            : event.endTime
                ? new Date(event.endTime)
                : new Date(event.eventDate);
        
        // When deadline is a date-only value (midnight), allow registration until end of that day
        if (event.reservationDeadline) {
            cutoffDate.setHours(23, 59, 59, 999);
        }

        if (cutoffDate < now) {
            throw new Error('Registration deadline has passed');
        }

        if (event.hostId === data.userId) {
            throw new Error('Host cannot join their own event');
        }

        // Check if event is full (only count active registrations)
        const activeBookings = event.bookings?.filter(
            b => b.status !== RegistrationStatus.REJECTED && b.status !== RegistrationStatus.CANCELLED
        ) || [];
        const isFull = event.maxGuests && activeBookings.length >= event.maxGuests;

        if (isFull && !event.allowWaitlist) {
            throw new Error('Event is full');
        }

        // Check for existing registration (allow re-registration if previously rejected)
        const existingRegistrations = await this.eventRegistrationRepository.findByUserId(data.userId);
        const existingForEvent = existingRegistrations.find(r => r.eventId === data.eventId);

        if (existingForEvent) {
            if (existingForEvent.status === RegistrationStatus.REJECTED) {
                // Remove rejected registration so user can re-apply
                await this.eventRegistrationRepository.deleteByEventAndUser(data.eventId, data.userId);
            } else {
                throw new Error('User already registered for this event');
            }
        }

        // Determine initial status
        let initialStatus = RegistrationStatus.PENDING;

        if (isFull && event.allowWaitlist) {
            initialStatus = RegistrationStatus.WAITLIST;
        } else if (event.accessType === EventAccessType.OPEN) {
            initialStatus = RegistrationStatus.APPROVED;
        } else if (event.accessType === EventAccessType.OPEN_WITH_APPROVAL) {
            initialStatus = RegistrationStatus.PENDING;
        }

        // Create registration
        const registration = await this.eventRegistrationRepository.create({
            eventId: data.eventId,
            userId: data.userId,
            answers: data.answers
        });

        // Notify Host (skip if event requires payment — notification will be sent after payment confirmation)
        const requiresPayment = Number(event.price) > 0;
        if (event.host && !requiresPayment) {
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
