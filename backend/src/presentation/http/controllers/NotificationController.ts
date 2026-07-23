import { FastifyRequest, FastifyReply } from 'fastify';
import { NotificationRepository } from '../../../domain/repositories/NotificationRepository';
import { UnauthorizedRequestError, getAuthenticatedUserId } from '../helpers/auth';

export class NotificationController {
    constructor(private notificationRepository: NotificationRepository) {}

    async list(req: FastifyRequest, reply: FastifyReply) {
        try {
            const userId = await getAuthenticatedUserId(req);
            const notifications = await this.notificationRepository.findByUserId(userId);

            return reply.send(notifications);
        } catch (error) {
            if (error instanceof UnauthorizedRequestError) {
                return reply.code(401).send({ message: error.message });
            }

            return reply.code(500).send({ message: 'Failed to fetch notifications' });
        }
    }

    async markAsRead(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const { id } = req.params;
            const userId = await getAuthenticatedUserId(req);
            const updated = await this.notificationRepository.markAsRead(id, userId);

            if (!updated) {
                return reply.code(404).send({ message: 'Notification not found' });
            }

            return reply.send({ success: true });
        } catch (error) {
            if (error instanceof UnauthorizedRequestError) {
                return reply.code(401).send({ message: error.message });
            }

            return reply.code(500).send({ message: 'Failed to mark notification as read' });
        }
    }
}
