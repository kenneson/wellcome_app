import { createHash } from 'crypto';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AuditTrail, outcomeFromStatusCode } from '../../../application/services/AuditTrail';
import type { AuthenticatedUserContext } from '../helpers/auth';
import { InMemoryRateLimiter, RateLimitRule } from './RateLimiter';

export interface AuditRouteConfig {
    action: string;
    targetType?: string;
    target?: (request: FastifyRequest) => unknown;
    metadata?: (request: FastifyRequest) => Record<string, unknown> | undefined;
}

declare module 'fastify' {
    interface FastifyContextConfig {
        rateLimit?: RateLimitRule;
        audit?: AuditRouteConfig;
    }

    interface FastifyRequest {
        authContext?: AuthenticatedUserContext;
    }
}

const minute = 60_000;

/** Limits for the sensitive routes. Each request counts against its IP and its bearer token. */
export const sensitiveRateLimits = {
    withdrawalRequest: { name: 'withdrawal-request', max: 5, windowMs: 10 * minute },
    adminWithdrawal: { name: 'admin-withdrawal', max: 30, windowMs: minute },
    adminKyc: { name: 'admin-kyc', max: 60, windowMs: minute },
    // Hosts scan a queue at the door, so this stays generous while blocking scripted enumeration.
    ticketValidation: { name: 'ticket-validation', max: 120, windowMs: minute },
    adminReconciliation: { name: 'admin-reconciliation', max: 6, windowMs: minute },
} satisfies Record<string, RateLimitRule>;

export const RATE_LIMITED_MESSAGE = 'Muitas tentativas. Aguarde alguns instantes e tente novamente.';

function bearerFingerprint(request: FastifyRequest): string | null {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) return null;
    const token = header.slice(7).trim();
    if (!token) return null;
    return createHash('sha256').update(token).digest('hex').slice(0, 32);
}

function safeCall<T>(fn: (() => T) | undefined): T | undefined {
    if (!fn) return undefined;
    try {
        return fn();
    } catch {
        return undefined;
    }
}

export function registerAbuseProtection(
    fastify: FastifyInstance,
    deps: { limiter: InMemoryRateLimiter; auditTrail: AuditTrail }
): void {
    fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
        const rule = request.routeOptions.config?.rateLimit;
        if (!rule) return;

        const keys = [`ip:${request.ip}`];
        const fingerprint = bearerFingerprint(request);
        if (fingerprint) keys.push(`token:${fingerprint}`);

        let retryAfterSeconds = 0;
        for (const key of keys) {
            const decision = deps.limiter.consume(key, rule);
            if (!decision.allowed) {
                retryAfterSeconds = Math.max(retryAfterSeconds, decision.retryAfterSeconds);
            }
        }
        if (retryAfterSeconds === 0) return;

        reply.header('Retry-After', String(retryAfterSeconds));
        return reply.code(429).send({ message: RATE_LIMITED_MESSAGE });
    });

    fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
        const audit = request.routeOptions.config?.audit;
        if (!audit) return;

        const target = safeCall(audit.target ? () => audit.target!(request) : undefined);
        const metadata = safeCall(audit.metadata ? () => audit.metadata!(request) : undefined);

        await deps.auditTrail.record({
            action: audit.action,
            outcome: outcomeFromStatusCode(reply.statusCode),
            actorId: request.authContext?.userId ?? null,
            actorRole: request.authContext?.role ?? null,
            targetType: audit.targetType ?? null,
            targetId: typeof target === 'string' && target ? target.slice(0, 200) : null,
            statusCode: reply.statusCode,
            ip: request.ip,
            requestId: String(request.id),
            metadata: metadata ?? {},
        });
    });
}
