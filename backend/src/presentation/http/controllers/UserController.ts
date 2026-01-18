import { FastifyReply, FastifyRequest } from 'fastify';
import { GetUserProfileUseCase } from '../../../application/use-cases/GetUserProfileUseCase';
import { UpdateUserProfileUseCase } from '../../../application/use-cases/UpdateUserProfileUseCase';

export class UserController {
    constructor(
        private getUserProfileUseCase: GetUserProfileUseCase,
        private updateUserProfileUseCase: UpdateUserProfileUseCase
    ) { }

    async getProfile(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        try {
            const user = await this.getUserProfileUseCase.execute(id);
            if (!user) {
                return reply.code(404).send({ message: 'User not found' });
            }
            return reply.send(user);
        } catch (error) {
            return reply.code(500).send({ message: 'Internal server error', error });
        }
    }

    async updateProfile(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as { id: string };
        const body = request.body as any; // Validation normally done via schema
        try {
            // Basic mapping from DTO to Entity partial
            const updateData = {
                fullName: body.full_name,
                occupation: body.occupation,
                bio: body.bio,
                lookingFor: body.looking_for,
                dietaryRestrictions: body.dietary_restrictions,
                avatarUrl: body.avatar_url,
                username: body.username,
                website: body.website
            };

            const user = await this.updateUserProfileUseCase.execute(id, updateData);
            return reply.send(user);
        } catch (error) {
            return reply.code(500).send({ message: 'Internal server error', error });
        }
    }
}
