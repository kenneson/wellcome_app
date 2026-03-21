import { UserRepository } from '../../domain/repositories/UserRepository';
import { User } from '../../domain/entities/User';
import { prisma } from '../database/prismaClient';

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

        console.log('DEBUG: Prisma User found:', Object.keys(user));
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
                website: data.website
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
            events: prismaUser.events ?? [],
            bookings: prismaUser.bookings ? prismaUser.bookings.map((b: any) => ({
                id: b.id,
                eventId: b.eventId,
                userId: b.userId,
                status: b.status,
                reviewedAt: b.reviewedAt,
                reviewedBy: b.reviewedBy,
                rejectionReason: b.rejectionReason,
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
}
