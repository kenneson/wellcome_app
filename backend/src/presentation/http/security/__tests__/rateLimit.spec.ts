import { InMemoryRateLimiter } from '../rateLimit';

describe('InMemoryRateLimiter', () => {
    const rule = { match: 'POST /auth/login', max: 2, windowMs: 1000 };

    it('matches by method and path prefix', () => {
        const limiter = new InMemoryRateLimiter([rule, { match: '/locations', max: 1, windowMs: 1000 }]);
        expect(limiter.findRule('POST', '/auth/login')).toBe(rule);
        expect(limiter.findRule('GET', '/auth/login')).toBeUndefined();
        expect(limiter.findRule('GET', '/locations/suggest')?.match).toBe('/locations');
        expect(limiter.findRule('GET', '/locationsx')).toBeUndefined();
    });

    it('blocks after the limit and resets after the window', () => {
        let now = 0;
        const limiter = new InMemoryRateLimiter([rule], () => now);
        expect(limiter.hit('ip', rule)).toBeNull();
        expect(limiter.hit('ip', rule)).toBeNull();
        expect(limiter.hit('ip', rule)).toBe(1);
        expect(limiter.hit('other-ip', rule)).toBeNull();
        now = 1001;
        expect(limiter.hit('ip', rule)).toBeNull();
    });
});
