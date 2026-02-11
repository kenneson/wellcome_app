export enum EventAccessType {
    OPEN = 'OPEN',
    OPEN_WITH_APPROVAL = 'OPEN_WITH_APPROVAL',
    PRIVATE = 'PRIVATE', // If applicable
    INVITE_ONLY = 'INVITE_ONLY' // If applicable
}

export enum RegistrationStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    WAITLIST = 'WAITLIST',
    CANCELLED = 'CANCELLED'
}

export interface EventQuestion {
    id: string;
    eventId: string;
    question: string;
    questionType: 'TEXT' | 'SELECT' | 'MULTI_SELECT'; // Adjust as per strict types
    options?: string[];
    required: boolean;
    order: number;
}

export interface Event {
    id: string;
    title: string;
    description: string;
    price: number;
    maxGuests: number;
    eventDate: string;
    location: string;
    latitude?: number | null;
    longitude?: number | null;
    coverImageUrl?: string | null;
    hostId: string;
    accessType: EventAccessType;
    requiresApproval: boolean;
    questions?: EventQuestion[];
    bookings?: EventRegistration[];
    createdAt: string;
    updatedAt: string;
}

export interface EventRegistration {
    id: string;
    eventId: string;
    userId: string;
    status: RegistrationStatus;
    answers?: any[]; // refine later
    createdAt: string;
    updatedAt: string;
    reviewedBy?: string | null;
    reviewedAt?: string | null;
    rejectionReason?: string | null;
}
