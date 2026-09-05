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
    CANCELLED = 'CANCELLED',
    EXPIRED = 'EXPIRED'
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

export interface EventHost {
    id: string;
    fullName: string;
    username?: string | null;
    email?: string | null;
    avatarUrl: string | null;
    occupation?: string;
    bio?: string;
    city?: string;
    neighborhood?: string;
    languages?: string[];
    birthDecade?: string;
    pets?: string;
    phoneNumber?: string | null;
    isSuperhost?: boolean;
    expoPushToken?: string | null;
    updatedAt: string;
}

export interface EventDish {
    id: string;
    eventId: string;
    name: string;
    description?: string;
    category?: string;
    order?: number;
    createdAt: string;
}

export interface EventReview {
    id: string;
    eventId: string;
    userId: string;
    rating: number;
    comment?: string;
    createdAt: string;
    user?: {
        id: string;
        fullName: string;
        avatarUrl: string | null;
    };
}

export interface Event {
    id: string;
    title: string;
    description: string;
    price: number;
    maxGuests: number;
    eventDate: string;
    location: string;
    city?: string | null;
    state?: string | null;
    locationNeedsReview?: boolean;
    latitude?: number | null;
    longitude?: number | null;
    distanceKm?: number;
    coverImageUrl?: string | null;
    imageGallery?: string[];
    eventType?: string;
    endTime?: string | null;
    reservationDeadline?: string | null;
    dietaryOptions?: string[];
    isServedInSequence?: boolean;
    hostId: string;
    host?: EventHost;
    accessType: EventAccessType;
    requiresApproval: boolean;
    allowWaitlist: boolean;
    questions?: EventQuestion[];
    bookings?: EventRegistration[];
    dishes?: EventDish[];
    reviews?: EventReview[];
    facilities?: string[];
    rules?: string[];
    participantCount?: number;
    pendingRegistrationCount?: number;
    confirmedRegistrationCount?: number;
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
    paymentDueAt?: string | null;
    paymentProviderStatus?: string | null;
    paymentStatus?: 'PENDING' | 'CONFIRMED' | 'EXPIRED' | 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'CHARGEBACK' | null;
}
