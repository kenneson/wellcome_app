import { EventRegistrationRepository } from '../../domain/repositories/EventRegistrationRepository';
import { EventRegistration, CreateRegistrationDTO } from '../../domain/entities/EventRegistration';
import { RegistrationStatus } from '../../domain/value-objects/RegistrationStatus';
import { prisma } from '../database/prismaClient';

export class PrismaEventRegistrationRepository implements EventRegistrationRepository {
    async create(data: CreateRegistrationDTO): Promise<EventRegistration> {
        const booking = await prisma.booking.create({
            data: {
                eventId: data.eventId,
                userId: data.userId,
                status: RegistrationStatus.PENDING, // Default status
                // If answers are provided, we would handle them here, but Booking model in Prisma might not have relation set up in code yet if we didn't update types
                // logic for answers will be added in Phase 4
            }
        });
        return this.mapToDomain(booking);
    }

    async findByEventId(eventId: string): Promise<EventRegistration[]> {
        const bookings = await prisma.booking.findMany({
            where: { eventId }
        });
        return bookings.map(b => this.mapToDomain(b));
    }

    async findByUserId(userId: string): Promise<EventRegistration[]> {
        const bookings = await prisma.booking.findMany({
            where: { userId: userId }
        });
        return bookings.map(b => this.mapToDomain(b));
    }

    async delete(id: string): Promise<void> {
        await prisma.booking.delete({ where: { id } });
    }

    async deleteByEventAndUser(eventId: string, userId: string): Promise<void> {
        await prisma.booking.deleteMany({
            where: {
                eventId: eventId,
                userId: userId
            }
        });
    }

    async updateStatus(id: string, status: string, rejectionReason?: string, reviewedBy?: string): Promise<EventRegistration> {
        const data: any = { status };
        if (rejectionReason) data.rejectionReason = rejectionReason;
        if (reviewedBy) {
            data.reviewedBy = reviewedBy;
            data.reviewedAt = new Date();
        }

        const booking = await prisma.booking.update({
            where: { id },
            data
        });

        return this.mapToDomain(booking);
    }

    async findById(id: string): Promise<EventRegistration | null> {
        const booking = await prisma.booking.findUnique({
            where: { id }
        });

        if (!booking) return null;
        return this.mapToDomain(booking);
    }

    private mapToDomain(prismaBooking: any): EventRegistration {
        return {
            id: prismaBooking.id,
            eventId: prismaBooking.eventId,
            userId: prismaBooking.userId,
            status: prismaBooking.status as RegistrationStatus,
            reviewedAt: prismaBooking.reviewedAt,
            reviewedBy: prismaBooking.reviewedBy,
            rejectionReason: prismaBooking.rejectionReason,
            attendedBefore: prismaBooking.attendedBefore,
            noShowCount: prismaBooking.noShowCount,
            createdAt: prismaBooking.createdAt,
            updatedAt: prismaBooking.updatedAt
        };
    }
}
