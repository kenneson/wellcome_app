export interface Notification {
    id: string;
    userId: string;
    type: string;
    title: string;
    body: string;
    data?: any;
    read: boolean;
    createdAt: Date;
}

export interface CreateNotificationDTO {
    userId: string;
    type: string;
    title: string;
    body: string;
    data?: any;
}

export interface NotificationRepository {
    create(data: CreateNotificationDTO): Promise<Notification>;
    findByUserId(userId: string): Promise<Notification[]>;
    markAsRead(id: string): Promise<void>;
}
