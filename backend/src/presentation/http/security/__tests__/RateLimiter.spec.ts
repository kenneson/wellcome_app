import { InMemoryRateLimiter } from '../RateLimiter';

describe('InMemoryRateLimiter', () => {
    const rule = { name: 'test', max: 3, windowMs: 60_000 };

    it('allows up to max requests per window and then blocks with retry-after', () => {
        const limiter = new InMemoryRateLimiter();
        const now = 1_000_000;

        expect(limiter.consume('ip:1', rule, now).allowed).toBe(true);
        expect(limiter.consume('ip:1', rule, now).allowed).toBe(true);
        expect(limiter.consume('ip:1', rule, now)).toEqual({ allowed: true, remaining: 0, retryAfterSeconds: 0 });

        const blocked = limiter.consume('ip:1', rule, now + 10_000);
        expect(blocked.allowed).toBe(false);
        expect(blocked.retryAfterSeconds).toBe(50);
    });

    it('starts a fresh window once the previous one expires', () => {
        const limiter = new InMemoryRateLimiter();
        for (let i = 0; i < 4; i++) limiter.consume('ip:1', rule, 0);

        expect(limiter.consume('ip:1', rule, 60_000).allowed).toBe(true);
    });

    it('keeps keys and bucket names independent', () => {
        const limiter = new InMemoryRateLimiter();
        for (let i = 0; i < 4; i++) limiter.consume('ip:1', rule, 0);

        expect(limiter.consume('ip:2', rule, 0).allowed).toBe(true);
        expect(limiter.consume('ip:1', { ...rule, name: 'other' }, 0).allowed).toBe(true);
    });

    it('evicts expired and excess keys so memory stays bounded', () => {
        const limiter = new InMemoryRateLimiter(100);
        for (let i = 0; i < 500; i++) limiter.consume(`ip:${i}`, rule, 0);

        expect(limiter.size).toBeLessThanOrEqual(100);

        limiter.consume('ip:new', rule, 120_000);
        expect(limiter.size).toBe(1);
    });
});
