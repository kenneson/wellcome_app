export interface EventDraft {
    id: string;
    hostId: string;
    payload: Record<string, unknown>;
    currentStep: number;
    schemaVersion: number;
    revision: number;
    publishKey: string | null;
    publishedEventId: string | null;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
