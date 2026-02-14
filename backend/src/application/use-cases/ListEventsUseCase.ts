import { EventRepository } from '../../domain/repositories/EventRepository';
import { Event } from '../../domain/entities/Event';

interface ListEventsInput {
    latitude?: number;
    longitude?: number;
    radiusInKm?: number;
    cuisine?: string[];
    vibe?: string[];
    priceMin?: number;
    priceMax?: number;
    eventType?: string;
    excludeHostId?: string;
}

export class ListEventsUseCase {
    constructor(private eventRepository: EventRepository) { }

    async execute(input?: ListEventsInput): Promise<Event[]> {
        return this.eventRepository.findAll(input);
    }

    async getById(id: string): Promise<Event | null> {
        return this.eventRepository.findById(id);
    }
}
