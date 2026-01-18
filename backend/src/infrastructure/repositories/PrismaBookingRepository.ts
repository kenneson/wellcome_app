import { BookingRepository } from '../../domain/repositories/BookingRepository';
import { Booking, CreateBookingDTO } from '../../domain/entities/Booking';
import { prisma } from '../database/prismaClient';

export class PrismaBookingRepository implements BookingRepository {
    async create(data: CreateBookingDTO): Promise<Booking> {
        const booking = await prisma.booking.create({
            data: {
                // 'userId' shorthand seems to differ in generated client vs expectation
                // Use explicit relation connect
                guest: { connect: { id: data.userId } },
                status: 'CONFIRMED'
            } as any
        });
        return this.mapToDomain(booking);
    }

    async findByEventId(eventId: string): Promise<Booking[]> {
        const bookings = await prisma.booking.findMany({
            where: { eventId }
        });
        return bookings.map(this.mapToDomain);
    }

    async findByUserId(userId: string): Promise<Booking[]> {
        const bookings = await prisma.booking.findMany({
            where: { guest: { id: userId } }
        });
        return bookings.map(this.mapToDomain);
    }

    async delete(id: string): Promise<void> {
        await prisma.booking.delete({ where: { id } });
    }

    async deleteByEventAndUser(eventId: string, userId: string): Promise<void> {
        await prisma.booking.deleteMany({
            where: {
                eventId: eventId,
                guest: { id: userId }
            }
        });
    }

    private mapToDomain(prismaBooking: any): Booking {
        return {
            ...prismaBooking,
            userId: prismaBooking.userId,
            status: prismaBooking.status as 'PENDING' | 'CONFIRMED' | 'CANCELLED'
        };
    }
}
