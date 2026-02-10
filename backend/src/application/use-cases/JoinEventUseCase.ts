import { EventRegistrationRepository } from '../../domain/repositories/EventRegistrationRepository';
import { EventRepository } from '../../domain/repositories/EventRepository';
import { EventRegistration } from '../../domain/entities/EventRegistration';
import { RegistrationStatus } from '../../domain/value-objects/RegistrationStatus';
import { EventAccessType } from '../../domain/value-objects/EventAccessType';

export interface JoinEventDTO {
    eventId: string;
    userId: string;
    answers?: { questionId: string; answer: string }[];
}

import { NotificationService, notificationService } from '../services/NotificationService';

export class JoinEventUseCase {
    constructor(
        private eventRegistrationRepository: EventRegistrationRepository,
        private eventRepository: EventRepository,
        private notificationService: NotificationService
    ) { }

    async execute(data: JoinEventDTO): Promise<EventRegistration> {
        const event = await this.eventRepository.findById(data.eventId);

        if (!event) {
            throw new Error('Event not found');
        }

        // Check if event is full
        const isFull = event.maxGuests && (event.bookings?.length || 0) >= event.maxGuests;

        if (isFull && !event.allowWaitlist) {
            throw new Error('Event is full');
        }

        // Check for existing registration
        const existingRegistrations = await this.eventRegistrationRepository.findByUserId(data.userId);
        console.log('[DEBUG] Existing registrations for user:', data.userId, existingRegistrations.map(r => ({ id: r.id, eventId: r.eventId })));

        const alreadyRegistered = existingRegistrations.some(r => r.eventId === data.eventId);

        if (alreadyRegistered) {
            console.warn('[DEBUG] User already registered:', { userId: data.userId, eventId: data.eventId });
            throw new Error('User already registered for this event');
        }

        // Determine initial status
        let initialStatus = RegistrationStatus.PENDING;

        if (isFull && event.allowWaitlist) {
            initialStatus = RegistrationStatus.WAITLIST;
        } else if (event.accessType === EventAccessType.OPEN) {
            initialStatus = RegistrationStatus.APPROVED;
        } else if (event.accessType === EventAccessType.OPEN_WITH_APPROVAL) {
            // Check auto-approval rules
            // TODO: Implement auto-approval logic based on rating or past attendance
            initialStatus = RegistrationStatus.PENDING;
        }

        // Create registration
        const registration = await this.eventRegistrationRepository.create({
            eventId: data.eventId,
            userId: data.userId,
            answers: data.answers
        });

        // Send notification to host including data for navigation
        if (event.host && event.host.expoPushToken) {
            // Determine message based on status
            const isPending = initialStatus === RegistrationStatus.PENDING;
            const notificationTitle = isPending ? 'Solicitação de inscrição!' : 'Nova inscrição confirmada!';
            const notificationBody = isPending
                ? `Alguém quer participar do seu evento "${event.title}" e aguarda aprovação.`
                : `Alguém se inscreveu no seu evento "${event.title}"!`;

            await this.notificationService.sendPushBlocking(
                event.host.expoPushToken,
                notificationTitle,
                notificationBody,
                { type: 'NEW_REGISTRATION', eventId: event.id }
            );
        }

        return registration;
    }
}
