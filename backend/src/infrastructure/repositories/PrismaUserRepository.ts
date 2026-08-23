import { UserRepository } from '../../domain/repositories/UserRepository';
import { User } from '../../domain/entities/User';
import { prisma } from '../database/prismaClient';
import { KycStatus, RegistrationStatus, WithdrawalStatus } from '@prisma/client';

export class PrismaUserRepository implements UserRepository {
    async findById(id: string): Promise<User | null> {
        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                events: true,
                bookings: {
                    include: {
                        event: {
                            include: {
                                host: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        });

        if (!user) return null;

        return this.mapToDomain(user);
    }

    async update(id: string, data: Partial<User>): Promise<User> {
        const user = await prisma.user.update({
            where: { id },
            data: {
                fullName: data.fullName,
                avatarUrl: data.avatarUrl,
                occupation: data.occupation,
                bio: data.bio,
                lookingFor: data.lookingFor,
                dietaryRestrictions: data.dietaryRestrictions,
                username: data.username,
                website: data.website,
                pixKey: data.pixKey,
                pixKeyType: data.pixKeyType
            },
            include: {
                events: true,
                bookings: true
            }
        });
        return this.mapToDomain(user);
    }

    private mapToDomain(prismaUser: any): User {
        return {
            id: prismaUser.id,
            fullName: prismaUser.fullName || prismaUser.full_name || null,
            username: prismaUser.username ?? null,
            website: prismaUser.website ?? null,
            avatarUrl: prismaUser.avatarUrl ?? prismaUser.avatar_url ?? null,
            occupation: prismaUser.occupation ?? null,
            bio: prismaUser.bio ?? null,
            lookingFor: prismaUser.lookingFor ?? prismaUser.looking_for ?? null,
            city: prismaUser.city ?? null,
            neighborhood: prismaUser.neighborhood ?? null,
            languages: prismaUser.languages ?? [],
            dietaryRestrictions: prismaUser.dietaryRestrictions ?? prismaUser.dietary_restrictions ?? [],
            phoneNumber: prismaUser.phoneNumber ?? prismaUser.phone_number ?? prismaUser.phone ?? null,
            walletBalance: prismaUser.walletBalance ? Number(prismaUser.walletBalance) : 0,
            pendingWalletBalance: prismaUser.pendingWalletBalance ? Number(prismaUser.pendingWalletBalance) : 0,
            pixKey: prismaUser.pixKey ?? null,
            pixKeyType: prismaUser.pixKeyType ?? null,
            kycStatus: prismaUser.kycStatus ?? null,
            kycDocumentUrl: prismaUser.kycDocumentUrl ?? null,
            kycSelfieUrl: prismaUser.kycSelfieUrl ?? null,
            kycSimilarityScore: prismaUser.kycSimilarityScore ?? null,
            kycSubmittedAt: prismaUser.kycSubmittedAt ?? null,
            kycReviewedAt: prismaUser.kycReviewedAt ?? null,
            kycRejectionReason: prismaUser.kycRejectionReason ?? null,
            events: prismaUser.events ?? [],
            bookings: prismaUser.bookings ? prismaUser.bookings.map((b: any) => ({
                id: b.id,
                eventId: b.eventId,
                userId: b.userId,
                status: b.status,
                reviewedAt: b.reviewedAt,
                reviewedBy: b.reviewedBy,
                rejectionReason: b.rejectionReason,
                paymentDueAt: b.paymentDueAt,
                attendedBefore: b.attendedBefore,
                noShowCount: b.noShowCount,
                event: b.event ? {
                    // Start partial event mapping (recursive if needed, but keep simple for User profile)
                    id: b.event.id,
                    title: b.event.title,
                    eventDate: b.event.eventDate,
                    location: b.event.location,
                    coverImageUrl: b.event.coverImageUrl,
                    hostId: b.event.hostId,
                    host: b.event.host
                } : undefined,
                createdAt: b.createdAt,
                updatedAt: b.updatedAt
            })) : [],
            updatedAt: prismaUser.updatedAt ?? prismaUser.updated_at ?? null
        };
    }

    async addWalletBalance(userId: string, amount: number, referenceId?: string): Promise<void> {
        await prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({ where: { id: userId } });
            if (!user) throw new Error('User not found');

            const novoSaldo = Number(user.walletBalance || 0) + amount;

            await tx.user.update({
                where: { id: userId },
                data: { walletBalance: novoSaldo }
            });

            await tx.walletTransaction.create({
                data: {
                    userId,
                    amount,
                    type: amount >= 0 ? 'CREDIT_EVENT_TICKET' : 'DEBIT_WITHDRAWAL',
                    description: amount >= 0 ? 'Pagamento de inscrição' : 'Saque',
                    referenceId
                }
            });
        });
    }

    async getAccountDeletionBlockers(userId: string): Promise<string[]> {
        const now = new Date();

        const [user, futureHostedEvents, activeBookings, pendingWithdrawals] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: { walletBalance: true, pendingWalletBalance: true }
            }),
            prisma.event.count({
                where: {
                    hostId: userId,
                    eventDate: { gte: now }
                }
            }),
            prisma.booking.count({
                where: {
                    userId,
                    status: {
                        in: [RegistrationStatus.PENDING, RegistrationStatus.APPROVED]
                    },
                    event: {
                        eventDate: { gte: now }
                    }
                }
            }),
            prisma.withdrawalRequest.count({
                where: {
                    userId,
                    status: {
                        in: [WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING]
                    }
                }
            })
        ]);

        if (!user) {
            return ['User not found'];
        }

        const blockers: string[] = [];

        if (Math.abs(Number(user.walletBalance || 0)) >= 0.005) {
            blockers.push('Your available wallet balance must be zero before deleting the account.');
        }

        if (Math.abs(Number(user.pendingWalletBalance || 0)) >= 0.005) {
            blockers.push('Your pending wallet balance must be zero before deleting the account.');
        }

        if (futureHostedEvents > 0) {
            blockers.push('You still have future events as host. Cancel or finish them before deleting the account.');
        }

        if (activeBookings > 0) {
            blockers.push('You still have active registrations in future events. Cancel them before deleting the account.');
        }

        if (pendingWithdrawals > 0) {
            blockers.push('There is a pending withdrawal linked to this account.');
        }

        return blockers;
    }

    async deleteAccount(userId: string): Promise<void> {
        const anonymizedUsername = `deleted-${userId.replace(/-/g, '').slice(0, 12)}`;

        await prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({
                where: { id: userId },
                select: { id: true }
            });

            if (!user) {
                throw new Error('User not found');
            }

            await tx.pushToken.deleteMany({
                where: { userId }
            });

            await tx.notification.deleteMany({
                where: { userId }
            });

            await tx.user.update({
                where: { id: userId },
                data: {
                    fullName: 'Deleted account',
                    username: anonymizedUsername,
                    avatarUrl: null,
                    website: null,
                    occupation: null,
                    bio: null,
                    dietaryRestrictions: [],
                    lookingFor: null,
                    city: null,
                    neighborhood: null,
                    languages: [],
                    phoneNumber: null,
                    expoPushToken: null,
                    email: null,
                    birthDecade: null,
                    pets: null,
                    isSuperhost: false,
                    pixKey: null,
                    pixKeyType: null,
                    kycStatus: KycStatus.NOT_SUBMITTED,
                    kycDocumentUrl: null,
                    kycSelfieUrl: null,
                    kycSimilarityScore: null,
                    kycSubmittedAt: null,
                    kycReviewedAt: null,
                    kycRejectionReason: null
                }
            });

            await tx.users.delete({
                where: { id: userId }
            });
        });
    }
}
