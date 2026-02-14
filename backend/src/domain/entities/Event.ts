import { EventDish } from './EventDish';
import { EventReview } from './EventReview';

export interface Event {
    id: string;
    title: string;
    description: string | null;
    price: number;
    maxGuests: number;
    eventDate: Date;
    endTime: Date | null;
    reservationDeadline: Date | null;
    location: string;
    latitude: number | null;
    longitude: number | null;
    coverImageUrl: string | null;
    imageGallery: string[];
    eventType: string | null;
    cuisineTypes: string[];
    vibe: string[];
    facilities: string[];
    rules: string[];
    dietaryOptions: string[];
    hostId: string;
    host?: import('./User').User;
    bookings?: import('./EventRegistration').EventRegistration[];
    questions?: import('./EventQuestion').EventQuestion[];
    dishes?: EventDish[];
    reviews?: EventReview[];

    // Approval fields
    accessType: import('../value-objects/EventAccessType').EventAccessType;
    requiresApproval: boolean;
    allowWaitlist: boolean;
    autoApproveIfAttended: boolean;
    autoApproveMinRating: number | null;

    createdAt: Date;
    updatedAt: Date;
}

export type CreateEventDTO = Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'questions' | 'dishes' | 'reviews'> & {
    questions?: {
        question: string;
        questionType: string;
        options?: string[];
        required: boolean;
        order: number;
    }[];
    dishes?: {
        name: string;
        description?: string;
        category: string;
        order: number;
    }[];
};

export type UpdateEventDTO = Partial<Omit<Event, 'id' | 'hostId' | 'createdAt' | 'updatedAt' | 'host' | 'bookings' | 'questions' | 'dishes' | 'reviews'>> & {
    questions?: {
        question: string;
        questionType: string;
        options?: string[];
        required: boolean;
        order?: number;
    }[];
    dishes?: {
        name: string;
        description?: string;
        category: string;
        order?: number;
    }[];
};
