import { Event } from './Event';
import { EventRegistration } from './EventRegistration';

export interface User {
    id: string;
    fullName: string | null;
    username?: string | null;
    website?: string | null;
    avatarUrl: string | null;
    occupation?: string | null;
    bio?: string | null;
    lookingFor?: string | null;
    city?: string | null;
    neighborhood?: string | null;
    languages?: string[];
    dietaryRestrictions?: string[];
    birthDecade?: string | null;
    pets?: string | null;
    events?: Event[];
    bookings?: EventRegistration[];
    expoPushToken?: string | null;
    updatedAt: Date;
}

