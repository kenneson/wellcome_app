import { Booking, CreateBookingDTO } from '../entities/Booking';

export interface BookingRepository {
    create(data: CreateBookingDTO): Promise<Booking>;
    findByEventId(eventId: string): Promise<Booking[]>;
    findByUserId(userId: string): Promise<Booking[]>;
    delete(id: string): Promise<void>;
    deleteByEventAndUser(eventId: string, userId: string): Promise<void>;
}
