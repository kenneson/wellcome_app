import { NotificationRepository } from '../../domain/repositories/NotificationRepository';
import { NotificationService } from '../services/NotificationService';
import { NotificationType } from '../../domain/value-objects/NotificationType';

export class SendNotificationUseCase {
    constructor(
        private notificationRepository: NotificationRepository,
        private notificationService: NotificationService
    ) {}

    async execute(userId: string, token: string | null, title: string, body: string, type: NotificationType, data?: any) {
        // 1. Create record in DB
        await this.notificationRepository.create({
            userId,
            title,
            body,
            type,
            data
        });

        // 2. Send Push
        if (token) {
            await this.notificationService.sendPushBlocking(token, title, body, data);
        }
    }
}
