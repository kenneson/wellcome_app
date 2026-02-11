import { EventRepository } from '../../domain/repositories/EventRepository';

export class DeleteEventUseCase {
    constructor(
        private eventRepository: EventRepository
    ) { }

    async execute(eventId: string, hostId: string): Promise<void> {
        const event = await this.eventRepository.findById(eventId);
        if (!event) {
            throw new Error('Event not found');
        }

        if (event.hostId !== hostId) {
            throw new Error('Only the host can delete this event');
        }

        await this.eventRepository.delete(eventId);
    }
}
