import { NotificationType } from '../value-objects/NotificationType';

export interface Notification {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: any;
    read: boolean;
    readAt?: Date;
    createdAt: Date;
}
