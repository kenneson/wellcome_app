import { EventRegistration, CreateRegistrationDTO } from '../entities/EventRegistration';

export interface EventRegistrationRepository {
    create(data: CreateRegistrationDTO): Promise<EventRegistration>;
    findByEventId(eventId: string): Promise<EventRegistration[]>;
    findByUserId(userId: string): Promise<EventRegistration[]>;
    delete(id: string): Promise<void>;
    deleteByEventAndUser(eventId: string, userId: string): Promise<void>;
}
