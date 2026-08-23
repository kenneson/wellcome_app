import { EventRegistration, CreateRegistrationDTO } from '../entities/EventRegistration';

export interface CapacityReconciliationAction {
    action: 'EXPIRED' | 'PROMOTED';
    bookingId: string;
    userId: string;
    newStatus: string;
}

export interface EventRegistrationRepository {
    create(data: CreateRegistrationDTO): Promise<EventRegistration>;
    findByEventId(eventId: string): Promise<EventRegistration[]>;
    findByEventIdWithUser(eventId: string): Promise<EventRegistration[]>;
    findByUserId(userId: string): Promise<EventRegistration[]>;
    delete(id: string): Promise<void>;
    deleteByEventAndUser(eventId: string, userId: string): Promise<void>;
    updateStatus(
        id: string,
        status: string,
        rejectionReason?: string,
        reviewedBy?: string,
        paymentDueAt?: Date | null
    ): Promise<EventRegistration>;
    findById(id: string): Promise<EventRegistration | null>;
    reconcileEventCapacity?(eventId: string, now?: Date): Promise<CapacityReconciliationAction[]>;
    createWithCapacityGuard?(data: CreateRegistrationDTO, now?: Date): Promise<EventRegistration>;
    approveWithCapacityGuard?(
        registrationId: string,
        eventId: string,
        hostId: string,
        paymentDueAt: Date | null,
        now?: Date
    ): Promise<EventRegistration | null>;
}
