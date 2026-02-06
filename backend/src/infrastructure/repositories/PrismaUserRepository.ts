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
        console.log('DEBUG: Prisma User full_name:', (user as any).full_name);
        console.log('DEBUG: Prisma User fullName:', (user as any).fullName);

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
            fullName: prismaUser.fullName ?? prismaUser.full_name ?? null,
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
            events: prismaUser.events ?? [],
            bookings: prismaUser.bookings ?? [],
            updatedAt: prismaUser.updatedAt ?? prismaUser.updated_at ?? null
        };
    }
}
