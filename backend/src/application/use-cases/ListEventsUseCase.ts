import { EventFilters, EventRepository } from '../../domain/repositories/EventRepository';
import { Event } from '../../domain/entities/Event';
import { isEventOpenForRegistration } from '../../domain/services/EventAvailability';

export class ListEventsUseCase {
    constructor(
        private eventRepository: EventRepository,
        private now: () => Date = () => new Date()
    ) { }

    async execute(input?: EventFilters): Promise<Event[]> {
        const events = await this.eventRepository.findAll(input);
        const now = this.now();
        return events.filter((event) => isEventOpenForRegistration(event, now));
    }

    async getById(id: string): Promise<Event | null> {
        return this.eventRepository.findById(id);
    }
}
