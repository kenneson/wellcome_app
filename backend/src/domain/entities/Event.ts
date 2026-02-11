export interface Event {
    id: string;
    title: string;
    description: string | null;
    price: number;
    maxGuests: number;
    eventDate: Date;
    location: string;
    latitude: number | null;
    longitude: number | null;
    coverImageUrl: string | null;
    eventType: string | null;
    cuisineTypes: string[];
    vibe: string[];
    facilities: string[];
    rules: string[];
    hostId: string;
    host?: import('./User').User;
    bookings?: import('./EventRegistration').EventRegistration[]; // Updated reference
    questions?: import('./EventQuestion').EventQuestion[]; // New relationship

    // Approval fields
    accessType: import('../value-objects/EventAccessType').EventAccessType;
    requiresApproval: boolean;
    allowWaitlist: boolean;
    autoApproveIfAttended: boolean;
    autoApproveMinRating: number | null;

    createdAt: Date;
    updatedAt: Date;
}

export type CreateEventDTO = Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'questions'> & {
    questions?: {
        question: string;
        questionType: string;
        options?: string[];
        required: boolean;
        order: number;
    }[];
};

export type UpdateEventDTO = Partial<Omit<Event, 'id' | 'hostId' | 'createdAt' | 'updatedAt' | 'host' | 'bookings' | 'questions'>> & {
    questions?: {
        question: string;
        questionType: string;
        options?: string[];
        required: boolean;
        order?: number;
    }[];
};
