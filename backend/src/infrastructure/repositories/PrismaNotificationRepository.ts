import { NotificationRepository, CreateNotificationDTO, Notification } from '../../domain/repositories/NotificationRepository';
import { prisma } from '../database/prismaClient';

export class PrismaNotificationRepository implements NotificationRepository {
    async create(data: CreateNotificationDTO): Promise<Notification> {
        const created = await prisma.notification.create({
            data: {
                userId: data.userId,
                type: data.type as any, // Enum
                title: data.title,
                body: data.body,
                data: data.data,
            }
        });
        return {
            ...created,
            data: created.data,
            type: created.type as string
        };
    }

    async findByUserId(userId: string): Promise<Notification[]> {
        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        return notifications.map(n => ({
            ...n,
            data: n.data,
            type: n.type as string
        }));
    }

    async markAsRead(id: string, userId: string): Promise<boolean> {
        const result = await prisma.notification.updateMany({
            where: { id, userId },
            data: { read: true, readAt: new Date() }
        });

        return result.count > 0;
    }
}
