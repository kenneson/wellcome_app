import { EventRepository } from '../../domain/repositories/EventRepository';
import { CreateEventDTO, Event } from '../../domain/entities/Event';

export class CreateEventUseCase {
    constructor(private eventRepository: EventRepository) { }

    async execute(data: CreateEventDTO): Promise<Event> {
        // Business validation could go here
        if (data.maxGuests < 1) {
            throw new Error('Event must have at least 1 guest');
        }

        return this.eventRepository.create(data);
    }
}
