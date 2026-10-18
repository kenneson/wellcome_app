import { AuditEntry, AuditLogRepository, AuditOutcome } from '../../domain/repositories/AuditLogRepository';

export interface StructuredLogger {
    info(object: Record<string, unknown>, message: string): void;
    warn(object: Record<string, unknown>, message: string): void;
    error(object: Record<string, unknown>, message: string): void;
}

export function outcomeFromStatusCode(statusCode: number): AuditOutcome {
    if (statusCode === 429) return 'rate_limited';
    if (statusCode === 401 || statusCode === 403) return 'denied';
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'rejected';
    return 'success';
}

/**
 * Writes every sensitive operation twice: as a structured log line (always,
 * so it reaches the log drain even if the database is down) and as a row in
 * public.audit_logs. Persisting is best-effort and never fails the request.
 */
export class AuditTrail {
    constructor(
        private repository: AuditLogRepository,
        private logger: StructuredLogger
    ) {}

    async record(entry: AuditEntry): Promise<void> {
        const line = { audit: true, ...entry, metadata: entry.metadata ?? {} };
        if (entry.outcome === 'success') {
            this.logger.info(line, `audit ${entry.action}`);
        } else {
            this.logger.warn(line, `audit ${entry.action} ${entry.outcome}`);
        }

        try {
            await this.repository.record(entry);
        } catch (error) {
            this.logger.error(
                { audit: true, action: entry.action, err: error instanceof Error ? error.message : String(error) },
                'audit log persistence failed'
            );
        }
    }
}
