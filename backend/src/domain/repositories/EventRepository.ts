import { CreateEventDTO, UpdateEventDTO, Event } from '../entities/Event';

export interface EventFilters {
    latitude?: number;
    longitude?: number;
    radiusInKm?: number;
    city?: string;
    cuisine?: string[];
    vibe?: string[];
    priceMin?: number;
    priceMax?: number;
    eventType?: string;
    excludeHostId?: string;
}

export interface EventRepository {
    create(data: CreateEventDTO): Promise<Event>;
    findAll(filters?: EventFilters): Promise<Event[]>;
    findById(id: string): Promise<Event | null>;
    update(id: string, data: UpdateEventDTO): Promise<Event>;
    delete(id: string): Promise<void>;
}
