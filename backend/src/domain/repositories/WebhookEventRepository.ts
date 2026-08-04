export interface WebhookEventRepository {
    startProcessing(data: {
        id: string;
        provider: string;
        eventType: string;
        payload: unknown;
    }): Promise<boolean>;

    markProcessed(id: string): Promise<void>;
    markFailed(id: string, error: string): Promise<void>;
}
