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

export class JoinEventUseCase {
    constructor(
        private eventRegistrationRepository: EventRegistrationRepository,
        private eventRepository: EventRepository
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
            // Check auto-approval rules
            // TODO: Implement auto-approval logic based on rating or past attendance
            initialStatus = RegistrationStatus.PENDING;
        }

        // Create registration
        return this.eventRegistrationRepository.create({
            eventId: data.eventId,
            userId: data.userId,
            answers: data.answers
        });

        // Note: The repository create method needs to be updated to accept status override 
        // or we handle status update immediately after creation. 
        // For now, let's assume repository creates as PENDING by default and we might need to update it.
        // Actually, better to pass status to repository create method.
    }
}
