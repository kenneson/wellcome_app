import { BookingRepository } from '../../domain/repositories/BookingRepository';
import { EventRepository } from '../../domain/repositories/EventRepository';
import { Booking, CreateBookingDTO } from '../../domain/entities/Booking';

export class CreateBookingUseCase {
    constructor(
        private bookingRepository: BookingRepository,
        private eventRepository: EventRepository
    ) { }

    async execute(data: CreateBookingDTO): Promise<Booking> {
        const event = await this.eventRepository.findById(data.eventId);

        if (!event) {
            throw new Error('Event not found');
        }

        if (event.maxGuests && (event.bookings?.length || 0) >= event.maxGuests) {
            throw new Error('Event is full');
        }

        const existingBookings = await this.bookingRepository.findByUserId(data.userId);
        const alreadyBooked = existingBookings.some(b => b.eventId === data.eventId);

        if (alreadyBooked) {
            throw new Error('User already booked for this event');
        }

        return this.bookingRepository.create(data);
    }
}
