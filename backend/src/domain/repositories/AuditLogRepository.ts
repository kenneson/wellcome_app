export type AuditOutcome = 'success' | 'denied' | 'rejected' | 'rate_limited' | 'error';

export interface AuditEntry {
    action: string;
    outcome: AuditOutcome;
    actorId?: string | null;
    actorRole?: string | null;
    targetType?: string | null;
    targetId?: string | null;
    statusCode?: number | null;
    ip?: string | null;
    requestId?: string | null;
    metadata?: Record<string, unknown>;
}

export interface AuditLogRepository {
    record(entry: AuditEntry): Promise<void>;
}
