import { EventRegistration, CreateRegistrationDTO } from '../entities/EventRegistration';

export interface EventRegistrationRepository {
    create(data: CreateRegistrationDTO): Promise<EventRegistration>;
    findByEventId(eventId: string): Promise<EventRegistration[]>;
    findByEventIdWithUser(eventId: string): Promise<EventRegistration[]>;
    findByUserId(userId: string): Promise<EventRegistration[]>;
    delete(id: string): Promise<void>;
    deleteByEventAndUser(eventId: string, userId: string): Promise<void>;
    updateStatus(id: string, status: string, rejectionReason?: string, reviewedBy?: string): Promise<EventRegistration>;
    findById(id: string): Promise<EventRegistration | null>;
}
