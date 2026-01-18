import { UserRepository } from '../../domain/repositories/UserRepository';
import { User } from '../../domain/entities/User';
import { prisma } from '../database/prismaClient';

export class PrismaUserRepository implements UserRepository {
    async findById(id: string): Promise<User | null> {
        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                events: true,
                bookings: true
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
            fullName: prismaUser.fullName,
            username: prismaUser.username,
            website: prismaUser.website,
            avatarUrl: prismaUser.avatarUrl,
            occupation: prismaUser.occupation,
            bio: prismaUser.bio,
            lookingFor: prismaUser.lookingFor,
            dietaryRestrictions: prismaUser.dietaryRestrictions,
            events: prismaUser.events,
            bookings: prismaUser.bookings,
            updatedAt: prismaUser.updatedAt
        };
    }
}
