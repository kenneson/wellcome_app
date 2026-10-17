import { StructuredLogger } from './AuditTrail';

export interface OpsAlert {
    /** Stable identifier; the same key is not re-sent while it is still within the cooldown. */
    key: string;
    severity: 'warning' | 'critical';
    title: string;
    details: Record<string, unknown>;
}

export type AlertTransport = (alert: OpsAlert) => Promise<void>;

/**
 * Emits operational alerts as `alert: true` error log lines and, when
 * OPS_ALERT_WEBHOOK_URL is configured, as a JSON POST (Slack/Discord-compatible
 * `text` field included). Repeated alerts are suppressed for `cooldownMs`.
 */
export class OpsAlerter {
    private lastSentAt = new Map<string, number>();

    constructor(
        private logger: StructuredLogger,
        private transport: AlertTransport | null = null,
        private cooldownMs = 6 * 60 * 60 * 1000
    ) {}

    async notify(alert: OpsAlert, now = Date.now()): Promise<boolean> {
        const previous = this.lastSentAt.get(alert.key);
        if (previous !== undefined && now - previous < this.cooldownMs) return false;
        this.lastSentAt.set(alert.key, now);

        this.logger.error({ alert: true, ...alert }, `ALERT ${alert.title}`);
        if (!this.transport) return true;
        try {
            await this.transport(alert);
        } catch (error) {
            this.logger.error(
                { alert: true, key: alert.key, err: error instanceof Error ? error.message : String(error) },
                'alert delivery failed'
            );
        }
        return true;
    }
}

export function createWebhookAlertTransport(
    url: string | undefined = process.env.OPS_ALERT_WEBHOOK_URL,
    fetchImpl: typeof fetch = fetch
): AlertTransport | null {
    if (!url) return null;
    return async (alert) => {
        const response = await fetchImpl(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: `[${alert.severity.toUpperCase()}] ${alert.title}`,
                ...alert,
            }),
            signal: AbortSignal.timeout(5_000),
        });
        if (!response.ok) throw new Error(`Alert webhook responded ${response.status}`);
    };
}
