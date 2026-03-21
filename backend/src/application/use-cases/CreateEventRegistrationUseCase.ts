import { CreateRegistrationDTO, EventRegistration } from '../../domain/entities/EventRegistration';
import { EventRegistrationRepository } from '../../domain/repositories/EventRegistrationRepository';
import { EventRepository } from '../../domain/repositories/EventRepository';

export class CreateEventRegistrationUseCase {
    constructor(
        private eventRegistrationRepository: EventRegistrationRepository,
        private eventRepository: EventRepository
    ) { }

    async execute(data: CreateRegistrationDTO): Promise<EventRegistration> {
        const event = await this.eventRepository.findById(data.eventId);

        if (!event) {
            throw new Error('Event not found');
        }

        if (event.maxGuests && (event.bookings?.length || 0) >= event.maxGuests) {
            throw new Error('Event is full');
        }

        const existingRegistrations = await this.eventRegistrationRepository.findByUserId(data.userId);
        const existingForEvent = existingRegistrations.find(b => b.eventId === data.eventId);

        if (existingForEvent) {
            if (existingForEvent.status === 'REJECTED') {
                // Remove rejected registration so user can re-apply
                await this.eventRegistrationRepository.deleteByEventAndUser(data.eventId, data.userId);
            } else {
                throw new Error('User already registered for this event');
            }
        }

        // Logic for auto-approval or pending status will go here later
        return this.eventRegistrationRepository.create(data);
    }
}
