import { AuditTrail, outcomeFromStatusCode } from '../AuditTrail';

describe('AuditTrail', () => {
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

    beforeEach(() => jest.clearAllMocks());

    it.each([
        [200, 'success'],
        [202, 'success'],
        [400, 'rejected'],
        [409, 'rejected'],
        [401, 'denied'],
        [403, 'denied'],
        [429, 'rate_limited'],
        [500, 'error'],
    ])('maps HTTP %s to %s', (statusCode, outcome) => {
        expect(outcomeFromStatusCode(statusCode)).toBe(outcome);
    });

    it('logs a structured line and persists the entry', async () => {
        const repository = { record: jest.fn().mockResolvedValue(undefined) };
        const trail = new AuditTrail(repository, logger);
        const entry = { action: 'kyc.approve', outcome: 'success' as const, actorId: 'admin-1', targetId: 'user-2' };

        await trail.record(entry);

        expect(logger.info).toHaveBeenCalledWith(
            expect.objectContaining({ audit: true, action: 'kyc.approve', actorId: 'admin-1', targetId: 'user-2' }),
            'audit kyc.approve'
        );
        expect(repository.record).toHaveBeenCalledWith(entry);
    });

    it('logs non-success outcomes as warnings', async () => {
        const trail = new AuditTrail({ record: jest.fn().mockResolvedValue(undefined) }, logger);

        await trail.record({ action: 'withdrawal.request', outcome: 'rate_limited' });

        expect(logger.warn).toHaveBeenCalledWith(
            expect.objectContaining({ outcome: 'rate_limited' }),
            'audit withdrawal.request rate_limited'
        );
    });

    it('never throws when the database write fails', async () => {
        const trail = new AuditTrail({ record: jest.fn().mockRejectedValue(new Error('db down')) }, logger);

        await expect(trail.record({ action: 'ticket.validate', outcome: 'success' })).resolves.toBeUndefined();
        expect(logger.error).toHaveBeenCalledWith(
            expect.objectContaining({ action: 'ticket.validate', err: 'db down' }),
            'audit log persistence failed'
        );
    });
});
