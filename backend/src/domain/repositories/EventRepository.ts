import { CreateEventDTO, Event } from '../entities/Event';

export interface EventRepository {
    create(data: CreateEventDTO): Promise<Event>;
    findAll(filters?: { latitude?: number; longitude?: number; radiusInKm?: number }): Promise<Event[]>;
    findById(id: string): Promise<Event | null>;
}
