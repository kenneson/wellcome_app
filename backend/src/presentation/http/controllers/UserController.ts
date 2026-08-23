import { FastifyReply, FastifyRequest } from 'fastify';
import { DeleteUserAccountBlockedError, DeleteUserAccountUseCase } from '../../../application/use-cases/DeleteUserAccountUseCase';
import { GetUserProfileUseCase } from '../../../application/use-cases/GetUserProfileUseCase';
import { UpdateUserProfileUseCase } from '../../../application/use-cases/UpdateUserProfileUseCase';
import { getAuthenticatedUserId, getOptionalAuthenticatedUserContext, UnauthorizedRequestError } from '../helpers/auth';
import { isEventOpenForRegistration } from '../../../domain/services/EventAvailability';
import { InvalidPixKeyError } from '../../../domain/services/PixKeyValidation';

export class UserController {
    constructor(
        private getUserProfileUseCase: GetUserProfileUseCase,
        private updateUserProfileUseCase: UpdateUserProfileUseCase,
        private deleteUserAccountUseCase: DeleteUserAccountUseCase
    ) { }

    async getProfile(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        try {
            const viewer = await getOptionalAuthenticatedUserContext(request);
            const canSeePrivateProfile = viewer?.userId === id || viewer?.role === 'ADMIN';
            const user = await this.getUserProfileUseCase.execute(id, canSeePrivateProfile);
            if (!user) {
                return reply.code(404).send({ message: 'User not found' });
            }

            return reply.send(canSeePrivateProfile ? user : this.toPublicProfile(user));
        } catch (error: any) {
            if (error instanceof UnauthorizedRequestError) {
                return reply.code(401).send({ message: error.message });
            }

            return reply.code(500).send({ message: 'Internal server error', error: error?.message });
        }
    }

    async updateProfile(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const body = request.body as any;
        try {
            const authenticatedUserId = await getAuthenticatedUserId(request);

            if (authenticatedUserId !== id) {
                return reply.code(403).send({ message: 'You can only update your own profile' });
            }

            const updateData = {
                fullName: body.full_name,
                occupation: body.occupation,
                bio: body.bio,
                lookingFor: body.looking_for,
                city: body.city,
                neighborhood: body.neighborhood,
                languages: body.languages,
                dietaryRestrictions: body.dietary_restrictions,
                avatarUrl: body.avatar_url,
                username: body.username,
                website: body.website,
                pixKey: body.pix_key,
                pixKeyType: body.pix_key_type
            };

            const user = await this.updateUserProfileUseCase.execute(id, updateData);
            return reply.send(user);
        } catch (error) {
            if (error instanceof UnauthorizedRequestError) {
                return reply.code(401).send({ message: error.message });
            }

            if (error instanceof InvalidPixKeyError || (error instanceof Error && error.message.includes('chave Pix'))) {
                return reply.code(400).send({ message: error.message });
            }

            return reply.code(500).send({ message: 'Internal server error' });
        }
    }

    async deleteAccount(request: FastifyRequest, reply: FastifyReply) {
        try {
            const authenticatedUserId = await getAuthenticatedUserId(request);

            await this.deleteUserAccountUseCase.execute(authenticatedUserId);

            return reply.code(204).send();
        } catch (error) {
            if (error instanceof UnauthorizedRequestError) {
                return reply.code(401).send({ message: error.message });
            }

            if (error instanceof DeleteUserAccountBlockedError) {
                return reply.code(409).send({ message: error.message, blockers: error.blockers });
            }

            if (error instanceof Error && error.message === 'User not found') {
                return reply.code(404).send({ message: error.message });
            }

            return reply.code(500).send({ message: 'Internal server error', error });
        }
    }

    private toPublicProfile(user: NonNullable<Awaited<ReturnType<GetUserProfileUseCase['execute']>>>) {
        return {
            id: user.id,
            fullName: user.fullName,
            username: user.username ?? null,
            avatarUrl: user.avatarUrl,
            occupation: user.occupation ?? null,
            bio: user.bio ?? null,
            lookingFor: user.lookingFor ?? null,
            city: user.city ?? null,
            neighborhood: user.neighborhood ?? null,
            languages: user.languages ?? [],
            dietaryRestrictions: user.dietaryRestrictions ?? [],
            isSuperhost: user.isSuperhost ?? false,
            events: (user.events ?? [])
                .filter((event: any) => isEventOpenForRegistration(event))
                .map((event: any) => ({
                    id: event.id,
                    title: event.title,
                    description: event.description,
                    eventDate: event.eventDate,
                    location: event.location,
                    coverImageUrl: event.coverImageUrl ?? null,
                })),
            bookings: (user.bookings ?? [])
                .filter((booking: any) => booking.status === 'APPROVED')
                .map((booking: any) => ({
                    id: booking.id,
                    status: booking.status,
                })),
            updatedAt: user.updatedAt,
        };
    }
}
