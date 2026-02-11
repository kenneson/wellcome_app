export interface PushToken {
    id: string;
    userId: string;
    token: string;
    platform: string;
    createdAt: Date;
    updatedAt: Date;
    lastUsedAt?: Date;
}
