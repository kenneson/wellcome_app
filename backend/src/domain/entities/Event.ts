export interface Event {
    id: string;
    title: string;
    description: string;
    price: number;
    maxGuests: number;
    eventDate: Date;
    location: string;
    latitude: number | null;
    longitude: number | null;
    coverImageUrl: string | null;
    hostId: string;
    host?: import('./User').User;
    bookings?: import('./Booking').Booking[];
    createdAt: Date;
    updatedAt: Date;
}

export type CreateEventDTO = Omit<Event, 'id' | 'createdAt' | 'updatedAt'>;
