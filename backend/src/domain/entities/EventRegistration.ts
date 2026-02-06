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

    // Decision data
    attendedBefore: boolean;
    noShowCount: number;

    // Relationships
    event?: import('./Event').Event;
    user?: import('./User').User;
    answers?: import('./RegistrationAnswer').RegistrationAnswer[];
    notes?: import('./RegistrationNote').RegistrationNote[];

    createdAt: Date;
    updatedAt: Date;
}

export interface CreateRegistrationDTO {
    eventId: string;
    userId: string;
    answers?: { questionId: string; answer: string }[];
}
