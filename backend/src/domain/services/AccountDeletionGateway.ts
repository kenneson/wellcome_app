export interface AccountDeletionGateway {
    deleteOwnedStorageObjects(userId: string): Promise<void>;
    deleteAuthUser(userId: string): Promise<void>;
}
