import { CreateRegistrationDTO, EventRegistration } from '../../domain/entities/EventRegistration';
import {
    CapacityReconciliationAction,
    EventRegistrationRepository,
} from '../../domain/repositories/EventRegistrationRepository';
import { RegistrationStatus } from '../../domain/value-objects/RegistrationStatus';
import { EventAccessType } from '../../domain/value-objects/EventAccessType';
import {
    calculateRegistrationPaymentDueAt,
    registrationHoldsCapacity,
} from '../../domain/services/RegistrationPaymentPolicy';
import { prisma } from '../database/prismaClient';

export class PrismaEventRegistrationRepository implements EventRegistrationRepository {
    async reconcileEventCapacity(eventId: string, now = new Date()): Promise<CapacityReconciliationAction[]> {
        const rows = await prisma.$queryRaw<Array<{
            action: string;
            booking_id: string;
            user_id: string;
            new_status: string;
        }>>`
            select *
            from private.reconcile_event_capacity(cast(${eventId} as uuid), ${now})
        `;

        return rows.map((row) => ({
            action: row.action as CapacityReconciliationAction['action'],
            bookingId: row.booking_id,
            userId: row.user_id,
            newStatus: row.new_status,
        }));
    }

    async createWithCapacityGuard(data: CreateRegistrationDTO, now = new Date()): Promise<EventRegistration> {
        const booking = await prisma.$transaction(async (tx) => {
            await tx.$queryRaw`
                select *
                from private.reconcile_event_capacity(cast(${data.eventId} as uuid), ${now})
            `;

            const event = await tx.event.findUnique({
                where: { id: data.eventId },
                include: { bookings: { include: { payment: { select: { status: true } } } } },
            });
            if (!event) throw new Error('Event not found');

            const mappedEvent = {
                accessType: event.accessType as EventAccessType,
                requiresApproval: event.requiresApproval,
                price: Number(event.price || 0),
            };
            const occupiedSpots = event.bookings.filter((current) => registrationHoldsCapacity(
                mappedEvent as any,
                {
                    status: current.status as RegistrationStatus,
                    paymentDueAt: current.paymentDueAt ?? undefined,
                    capacityHeldAt: current.capacityHeldAt ?? undefined,
                    paymentStatus: current.payment?.status as any,
                },
                now
            )).length;
            const isFull = Boolean(event.maxGuests && occupiedSpots >= event.maxGuests);
            if (isFull && !event.allowWaitlist) throw new Error('Event is full');

            let status = RegistrationStatus.PENDING;
            if (isFull) {
                status = RegistrationStatus.WAITLIST;
            } else if (Number(event.price || 0) <= 0 && event.accessType === EventAccessType.OPEN) {
                status = RegistrationStatus.APPROVED;
            }

            const paymentDueAt = Number(event.price || 0) > 0
                && status === RegistrationStatus.PENDING
                && event.accessType === EventAccessType.OPEN
                && !event.requiresApproval
                ? calculateRegistrationPaymentDueAt({ eventDate: event.eventDate } as any, now)
                : null;

            return tx.booking.create({
                data: {
                    eventId: data.eventId,
                    userId: data.userId,
                    status,
                    paymentDueAt,
                    ...(data.answers?.length ? {
                        answers: {
                            create: data.answers.map((answer) => ({
                                questionId: answer.questionId,
                                answer: answer.answer.trim(),
                            })),
                        },
                    } : {}),
                },
                include: { answers: true },
            });
        });

        return this.mapToDomain(booking);
    }

    async approveWithCapacityGuard(
        registrationId: string,
        eventId: string,
        hostId: string,
        paymentDueAt: Date | null,
        now = new Date()
    ): Promise<EventRegistration | null> {
        const booking = await prisma.$transaction(async (tx) => {
            await tx.$queryRaw`
                select *
                from private.reconcile_event_capacity(cast(${eventId} as uuid), ${now})
            `;

            const event = await tx.event.findUnique({
                where: { id: eventId },
                include: { bookings: { include: { payment: { select: { status: true } } } } },
            });
            if (!event) throw new Error('Event not found');
            if (event.hostId !== hostId) throw new Error('Unauthorized: You are not the host of this event');

            const occupiedSpots = event.bookings.filter((current) =>
                current.id !== registrationId && registrationHoldsCapacity(
                    {
                        accessType: event.accessType as EventAccessType,
                        requiresApproval: event.requiresApproval,
                        price: Number(event.price || 0),
                    } as any,
                    {
                        status: current.status as RegistrationStatus,
                        paymentDueAt: current.paymentDueAt ?? undefined,
                        capacityHeldAt: current.capacityHeldAt ?? undefined,
                        paymentStatus: current.payment?.status as any,
                    },
                    now
                )
            ).length;
            if (event.maxGuests && occupiedSpots >= event.maxGuests) return null;

            return tx.booking.update({
                where: { id: registrationId },
                data: {
                    status: RegistrationStatus.APPROVED,
                    reviewedBy: hostId,
                    reviewedAt: now,
                    rejectionReason: null,
                    paymentDueAt,
                    capacityHeldAt: null,
                },
                include: { guest: true, event: true, payment: true },
            });
        });

        return booking ? this.mapToDomain(booking) : null;
    }

    async create(data: CreateRegistrationDTO): Promise<EventRegistration> {
        const booking = await prisma.booking.create({
            data: {
                eventId: data.eventId,
                userId: data.userId,
                status: data.status ?? RegistrationStatus.PENDING,
                paymentDueAt: data.paymentDueAt ?? null,
                ...(data.answers?.length ? {
                    answers: {
                        create: data.answers.map((answer) => ({
                            questionId: answer.questionId,
                            answer: answer.answer.trim(),
                        })),
                    },
                } : {}),
            },
            include: { answers: true },
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
                payment: true,
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

    async updateStatus(
        id: string,
        status: string,
        rejectionReason?: string,
        reviewedBy?: string,
        paymentDueAt?: Date | null
    ): Promise<EventRegistration> {
        const data: any = { status };
        if (rejectionReason) data.rejectionReason = rejectionReason;
        if (reviewedBy) {
            data.reviewedBy = reviewedBy;
            data.reviewedAt = new Date();
        }
        if (paymentDueAt !== undefined) data.paymentDueAt = paymentDueAt;
        if (status !== RegistrationStatus.APPROVED) data.paymentDueAt = null;
        if (status !== RegistrationStatus.PENDING) data.capacityHeldAt = null;

        const booking = await prisma.booking.update({
            where: { id },
            data,
            include: {
                guest: true,
                event: true,
                payment: true
            }
        });

        return this.mapToDomain(booking);
    }

    async findById(id: string): Promise<EventRegistration | null> {
        const booking = await prisma.booking.findUnique({
            where: { id },
            include: {
                guest: true, // Include guest for push token if needed later
                event: true,
                payment: true
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
            paymentDueAt: prismaBooking.paymentDueAt ?? undefined,
            capacityHeldAt: prismaBooking.capacityHeldAt ?? undefined,
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
                updatedAt: prismaBooking.event.updatedAt,
                price: prismaBooking.event.price
            } as any : undefined,
            paymentStatus: prismaBooking.payment?.status,
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
