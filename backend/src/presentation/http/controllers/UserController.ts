import { FastifyReply, FastifyRequest } from 'fastify';
import { DeleteUserAccountBlockedError, DeleteUserAccountUseCase } from '../../../application/use-cases/DeleteUserAccountUseCase';
import { GetUserProfileUseCase } from '../../../application/use-cases/GetUserProfileUseCase';
import { UpdateUserProfileUseCase } from '../../../application/use-cases/UpdateUserProfileUseCase';
import { getAuthenticatedUserId, UnauthorizedRequestError } from '../helpers/auth';

export class UserController {
    constructor(
        private getUserProfileUseCase: GetUserProfileUseCase,
        private updateUserProfileUseCase: UpdateUserProfileUseCase,
        private deleteUserAccountUseCase: DeleteUserAccountUseCase
    ) { }

    async getProfile(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        try {
            console.log('Fetching profile for user:', id);
            const user = await this.getUserProfileUseCase.execute(id);
            if (!user) {
                console.log('User not found:', id);
                return reply.code(404).send({ message: 'User not found' });
            }
            console.log('User found:', user.id, user.fullName);
            return reply.send(user);
        } catch (error: any) {
            console.error('Error in getProfile:', error);
            console.error('Error stack:', error?.stack);
            return reply.code(500).send({ message: 'Internal server error', error: error?.message });
        }
    }

    async updateProfile(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const body = request.body as any; // Validation normally done via schema
        try {
            const authenticatedUserId = await getAuthenticatedUserId(request);

            if (authenticatedUserId !== id) {
                return reply.code(403).send({ message: 'You can only update your own profile' });
            }

            // Basic mapping from DTO to Entity partial
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

            return reply.code(500).send({ message: 'Internal server error', error });
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
}
