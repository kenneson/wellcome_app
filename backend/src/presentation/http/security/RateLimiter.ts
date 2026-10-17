export interface RateLimitRule {
    /** Bucket name shared by every route that should count together. */
    name: string;
    max: number;
    windowMs: number;
}

export interface RateLimitDecision {
    allowed: boolean;
    remaining: number;
    retryAfterSeconds: number;
}

interface Window {
    count: number;
    resetAt: number;
}

/**
 * Fixed-window counter kept in process memory. The backend runs as a single
 * instance today; if it is scaled horizontally this must move to a shared
 * store (Redis or Postgres) or each instance will apply its own limit.
 */
export class InMemoryRateLimiter {
    private windows = new Map<string, Window>();
    private lastSweep = 0;

    constructor(private maxKeys = 50_000) {}

    consume(key: string, rule: RateLimitRule, now = Date.now()): RateLimitDecision {
        this.sweep(now);
        const bucketKey = `${rule.name}:${key}`;
        let window = this.windows.get(bucketKey);
        if (!window || window.resetAt <= now) {
            window = { count: 0, resetAt: now + rule.windowMs };
            this.windows.set(bucketKey, window);
        }

        window.count += 1;
        const allowed = window.count <= rule.max;
        return {
            allowed,
            remaining: Math.max(0, rule.max - window.count),
            retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((window.resetAt - now) / 1000)),
        };
    }

    get size(): number {
        return this.windows.size;
    }

    private sweep(now: number): void {
        if (now - this.lastSweep < 60_000 && this.windows.size < this.maxKeys) return;
        this.lastSweep = now;
        for (const [key, window] of this.windows) {
            if (window.resetAt <= now) this.windows.delete(key);
        }
        // Under a flood of unique keys, drop the oldest entries instead of growing unbounded.
        if (this.windows.size >= this.maxKeys) {
            const excess = this.windows.size - Math.floor(this.maxKeys * 0.9);
            let removed = 0;
            for (const key of this.windows.keys()) {
                if (removed >= excess) break;
                this.windows.delete(key);
                removed += 1;
            }
        }
    }
}
