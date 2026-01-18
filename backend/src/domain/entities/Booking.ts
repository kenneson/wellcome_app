export interface Booking {
    id: string;
    eventId: string;
    userId: string;
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateBookingDTO {
    eventId: string;
    userId: string;
}
