import { CreateRegistrationDTO, EventRegistration } from '../../domain/entities/EventRegistration';
import { EventRegistrationRepository } from '../../domain/repositories/EventRegistrationRepository';
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

    // Find registrations with user data for host management screen
    async findByEventIdWithUser(eventId: string): Promise<EventRegistration[]> {
        const bookings = await prisma.booking.findMany({
            where: { eventId },
            include: {
                guest: true,
                answers: {
                    include: {
                        question: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
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
            data,
            include: {
                guest: true,
                event: true
            }
        });

        return this.mapToDomain(booking);
    }

    async findById(id: string): Promise<EventRegistration | null> {
        const booking = await prisma.booking.findUnique({
            where: { id },
            include: {
                guest: true, // Include guest for push token if needed later
                event: true
            }
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
            user: prismaBooking.guest ? {
                id: prismaBooking.guest.id,
                fullName: prismaBooking.guest.fullName,
                avatarUrl: prismaBooking.guest.avatarUrl,
                occupation: prismaBooking.guest.occupation,
                bio: prismaBooking.guest.bio,
                website: prismaBooking.guest.website,
                lookingFor: prismaBooking.guest.lookingFor,
                city: prismaBooking.guest.city,
                neighborhood: prismaBooking.guest.neighborhood,
                languages: prismaBooking.guest.languages,
                dietaryRestrictions: prismaBooking.guest.dietaryRestrictions,
                expoPushToken: prismaBooking.guest.expoPushToken,
                phoneNumber: prismaBooking.guest.phoneNumber || prismaBooking.guest.phone_number || prismaBooking.guest.phone || null,
                updatedAt: prismaBooking.guest.updatedAt
            } : undefined,
            event: prismaBooking.event ? {
                id: prismaBooking.event.id,
                hostId: prismaBooking.event.hostId,
                title: prismaBooking.event.title,
                eventDate: prismaBooking.event.eventDate,
                location: prismaBooking.event.location,
                updatedAt: prismaBooking.event.updatedAt
            } as any : undefined,
            answers: prismaBooking.answers ? prismaBooking.answers.map((a: any) => ({
                questionId: a.questionId,
                question: a.question?.question || '',
                answer: a.answer
            })) : [],
            createdAt: prismaBooking.createdAt,
            updatedAt: prismaBooking.updatedAt
        };
    }
}
