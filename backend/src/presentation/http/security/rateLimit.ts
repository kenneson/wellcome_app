import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export interface RateLimitRule {
    /** Route prefix (method optional), e.g. "POST /auth/login" or "/payments". */
    match: string;
    /** Requests allowed per window, per client IP. */
    max: number;
    windowMs: number;
}

interface Bucket {
    count: number;
    resetAt: number;
}

/**
 * Small in-memory, per-IP fixed-window limiter. It is good enough for a single
 * backend instance; move to Redis (e.g. @fastify/rate-limit with a store) if the
 * API is ever scaled to more than one container.
 */
export class InMemoryRateLimiter {
    private buckets = new Map<string, Bucket>();
    private lastSweep = Date.now();

    constructor(private rules: RateLimitRule[], private now: () => number = Date.now) {}

    findRule(method: string, path: string): RateLimitRule | undefined {
        return this.rules.find((rule) => {
            const [maybeMethod, maybePath] = rule.match.includes(' ') ? rule.match.split(' ') : [undefined, rule.match];
            if (maybeMethod && maybeMethod.toUpperCase() !== method.toUpperCase()) return false;
            return path === maybePath || path.startsWith(`${maybePath}/`);
        });
    }

    /** Returns seconds until the window resets when the request is over the limit, otherwise null. */
    hit(key: string, rule: RateLimitRule): number | null {
        const current = this.now();
        this.sweep(current);
        const bucket = this.buckets.get(key);
        if (!bucket || bucket.resetAt <= current) {
            this.buckets.set(key, { count: 1, resetAt: current + rule.windowMs });
            return null;
        }
        bucket.count += 1;
        if (bucket.count > rule.max) {
            return Math.max(1, Math.ceil((bucket.resetAt - current) / 1000));
        }
        return null;
    }

    private sweep(current: number) {
        if (current - this.lastSweep < 60_000) return;
        this.lastSweep = current;
        for (const [key, bucket] of this.buckets) {
            if (bucket.resetAt <= current) this.buckets.delete(key);
        }
    }
}

const MINUTE = 60_000;

export const DEFAULT_RATE_LIMIT_RULES: RateLimitRule[] = [
    { match: 'POST /auth/login', max: 10, windowMs: 15 * MINUTE },
    { match: 'POST /auth/register', max: 5, windowMs: 60 * MINUTE },
    { match: 'POST /payments', max: 20, windowMs: 10 * MINUTE },
    { match: 'POST /billing', max: 10, windowMs: 10 * MINUTE },
    { match: 'POST /withdrawals', max: 5, windowMs: 60 * MINUTE },
    { match: 'POST /reports', max: 10, windowMs: 60 * MINUTE },
    { match: 'POST /bookings', max: 60, windowMs: 10 * MINUTE },
    { match: '/locations', max: 60, windowMs: MINUTE },
    { match: 'GET /events', max: 120, windowMs: MINUTE },
];

export function registerRateLimit(fastify: FastifyInstance, rules: RateLimitRule[] = DEFAULT_RATE_LIMIT_RULES) {
    const limiter = new InMemoryRateLimiter(rules);

    fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
        if (request.method === 'OPTIONS') return;
        const path = request.url.split('?')[0];
        if (path.startsWith('/webhooks/')) return;

        const rule = limiter.findRule(request.method, path);
        if (!rule) return;

        const retryAfter = limiter.hit(`${rule.match}|${request.ip}`, rule);
        if (retryAfter !== null) {
            reply.header('Retry-After', String(retryAfter));
            return reply.code(429).send({ message: 'Muitas tentativas. Aguarde um pouco e tente novamente.' });
        }
    });
}
