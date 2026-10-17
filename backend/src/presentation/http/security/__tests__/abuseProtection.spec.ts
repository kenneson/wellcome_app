import Fastify, { FastifyInstance } from 'fastify';
import { AuditTrail } from '../../../../application/services/AuditTrail';
import { InMemoryRateLimiter } from '../RateLimiter';
import { RATE_LIMITED_MESSAGE, registerAbuseProtection } from '../abuseProtection';

describe('registerAbuseProtection', () => {
    let app: FastifyInstance;
    const record = jest.fn().mockResolvedValue(undefined);

    beforeEach(async () => {
        record.mockClear();
        app = Fastify();
        registerAbuseProtection(app, {
            limiter: new InMemoryRateLimiter(),
            auditTrail: { record } as unknown as AuditTrail,
        });

        app.post('/withdrawals', {
            config: {
                rateLimit: { name: 'withdrawal', max: 2, windowMs: 60_000 },
                audit: {
                    action: 'withdrawal.request',
                    targetType: 'withdrawal',
                    metadata: (req) => ({ amount: (req.body as { amount?: number } | undefined)?.amount }),
                },
            },
        }, async (req, reply) => {
            if (req.headers.authorization === 'Bearer bad') {
                return reply.code(401).send({ message: 'invalid' });
            }
            req.authContext = { userId: 'user-1', role: 'USER' as any };
            return reply.code(201).send({ ok: true });
        });

        app.post('/tickets/:id', {
            config: {
                audit: {
                    action: 'ticket.validate',
                    targetType: 'booking',
                    target: (req) => (req.params as { id: string }).id,
                },
            },
        }, async () => {
            throw new Error('boom');
        });

        app.get('/plain', async () => ({ ok: true }));
        await app.ready();
    });

    afterEach(async () => {
        await app.close();
    });

    const post = (authorization = 'Bearer token-a', ip = '10.0.0.1') => app.inject({
        method: 'POST',
        url: '/withdrawals',
        headers: { authorization },
        payload: { amount: 50 },
        remoteAddress: ip,
    });

    it('returns 429 with Retry-After once the limit is exceeded', async () => {
        expect((await post()).statusCode).toBe(201);
        expect((await post()).statusCode).toBe(201);

        const blocked = await post();
        expect(blocked.statusCode).toBe(429);
        expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
        expect(blocked.json()).toEqual({ message: RATE_LIMITED_MESSAGE });
    });

    it('counts per token too, so rotating IPs does not bypass the limit', async () => {
        await post('Bearer token-a', '10.0.0.1');
        await post('Bearer token-a', '10.0.0.2');

        expect((await post('Bearer token-a', '10.0.0.3')).statusCode).toBe(429);
        expect((await post('Bearer token-b', '10.0.0.4')).statusCode).toBe(201);
    });

    it('records a structured audit entry with the verified actor and metadata', async () => {
        await post();

        expect(record).toHaveBeenCalledWith(expect.objectContaining({
            action: 'withdrawal.request',
            outcome: 'success',
            actorId: 'user-1',
            actorRole: 'USER',
            targetType: 'withdrawal',
            statusCode: 201,
            ip: '10.0.0.1',
            metadata: { amount: 50 },
        }));
    });

    it('audits denied, rate-limited and failed requests with the matching outcome', async () => {
        await post('Bearer bad');
        await post();
        await post();
        await post();
        await app.inject({ method: 'POST', url: '/tickets/booking-9' });

        const outcomes = record.mock.calls.map(([entry]) => [entry.action, entry.outcome, entry.actorId]);
        expect(outcomes).toEqual([
            ['withdrawal.request', 'denied', null],
            ['withdrawal.request', 'success', 'user-1'],
            ['withdrawal.request', 'rate_limited', null],
            ['withdrawal.request', 'rate_limited', null],
            ['ticket.validate', 'error', null],
        ]);
        expect(record.mock.calls[4][0].targetId).toBe('booking-9');
    });

    it('leaves routes without config untouched', async () => {
        for (let i = 0; i < 5; i++) {
            expect((await app.inject({ method: 'GET', url: '/plain' })).statusCode).toBe(200);
        }
        expect(record).not.toHaveBeenCalled();
    });
});
