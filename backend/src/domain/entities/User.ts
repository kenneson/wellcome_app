import { Event } from './Event';
import { Booking } from './Booking';

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
    events?: Event[];
    bookings?: Booking[];
    updatedAt: Date;
}
