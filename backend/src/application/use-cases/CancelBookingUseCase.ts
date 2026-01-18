import { BookingRepository } from '../../domain/repositories/BookingRepository';

export class CancelBookingUseCase {
    constructor(private bookingRepository: BookingRepository) { }

    async execute(eventId: string, userId: string): Promise<void> {
        return this.bookingRepository.deleteByEventAndUser(eventId, userId);
    }
}
