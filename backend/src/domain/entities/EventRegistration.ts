import { RegistrationStatus } from '../value-objects/RegistrationStatus';

export interface EventRegistration {
    id: string;
    eventId: string;
    userId: string;

    status: RegistrationStatus;

    // Approval metadata
    reviewedAt?: Date;
    reviewedBy?: string;
    rejectionReason?: string;
    paymentDueAt?: Date;
    capacityHeldAt?: Date;
    paymentProviderStatus?: string;

    // Decision data
    attendedBefore: boolean;
    noShowCount: number;

    // Relationships
    event?: import('./Event').Event;
    user?: import('./User').User;
    answers?: import('./RegistrationAnswer').RegistrationAnswer[];
    notes?: import('./RegistrationNote').RegistrationNote[];
    paymentStatus?: import('../value-objects/PaymentStatus').PaymentStatus;

    createdAt: Date;
    updatedAt: Date;
}

export interface CreateRegistrationDTO {
    eventId: string;
    userId: string;
    status?: RegistrationStatus;
    paymentDueAt?: Date | null;
    answers?: { questionId: string; answer: string }[];
}
