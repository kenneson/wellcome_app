import { EventRegistrationRepository } from '../../domain/repositories/EventRegistrationRepository';
import { EventRepository } from '../../domain/repositories/EventRepository';
import { EventRegistration } from '../../domain/entities/EventRegistration';
import { RegistrationStatus } from '../../domain/value-objects/RegistrationStatus';
import { EventAccessType } from '../../domain/value-objects/EventAccessType';
import { SendNotificationUseCase } from './SendNotificationUseCase';
import { NotificationType } from '../../domain/value-objects/NotificationType';

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

        if (event.hostId === data.userId) {
            throw new Error('Host cannot join their own event');
        }

        // Bloqueia inscrições em eventos passados
        if (new Date(event.eventDate).getTime() < new Date().getTime()) {
            throw new Error('Cannot join past events');
        }

        // Verifica o prazo de inscrição (se existir)
        if (event.reservationDeadline && new Date(event.reservationDeadline).getTime() < new Date().getTime()) {
            throw new Error('Registration deadline has passed');
        }

        // Check if event is full
        const isFull = event.maxGuests && (event.bookings?.length || 0) >= event.maxGuests;

        if (isFull && !event.allowWaitlist) {
            throw new Error('Event is full');
        }

        // Check for existing registration
        const existingRegistrations = await this.eventRegistrationRepository.findByUserId(data.userId);
        const alreadyRegistered = existingRegistrations.some(r => r.eventId === data.eventId);

        if (alreadyRegistered) {
            throw new Error('User already registered for this event');
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

        // Notify Host
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
