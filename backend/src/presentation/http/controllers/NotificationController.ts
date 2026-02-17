import { FastifyRequest, FastifyReply } from 'fastify';
import { NotificationRepository } from '../../../domain/repositories/NotificationRepository';

export class NotificationController {
    constructor(private notificationRepository: NotificationRepository) {}

    async list(req: FastifyRequest<{ Querystring: { userId: string } }>, reply: FastifyReply) {
        // Temporary: Get userId from query params until auth middleware is set up
        const { userId } = req.query;
        
        if (!userId) {
            return reply.code(400).send({ message: 'Missing userId in query params' });
        }
        
        const notifications = await this.notificationRepository.findByUserId(userId);
        return reply.send(notifications);
    }

    async markAsRead(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        const { id } = req.params;
        await this.notificationRepository.markAsRead(id);
        return reply.send({ success: true });
    }
}
