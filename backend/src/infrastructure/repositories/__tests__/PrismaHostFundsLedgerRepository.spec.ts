import { prisma } from '../../database/prismaClient';
import { PrismaHostFundsLedgerRepository } from '../PrismaHostFundsLedgerRepository';

jest.mock('../../database/prismaClient', () => ({
    prisma: { $queryRaw: jest.fn() },
}));

describe('PrismaHostFundsLedgerRepository', () => {
    const repository = new PrismaHostFundsLedgerRepository();
    const queryRaw = prisma.$queryRaw as unknown as jest.Mock;

    beforeEach(() => jest.clearAllMocks());

    it('splits each mismatching profile into one violation per broken invariant', async () => {
        queryRaw.mockResolvedValue([
            { user_id: 'host-1', pending_actual: '50.00', pending_expected: '45.00', wallet_actual: '10.00', wallet_expected: '12.00' },
            { user_id: 'host-2', pending_actual: '0.00', pending_expected: '0', wallet_actual: '-5.00', wallet_expected: '0' },
        ]);

        await expect(repository.findBalanceInvariantViolations(10)).resolves.toEqual([
            { userId: 'host-1', kind: 'pending_balance_mismatch', actual: 50, expected: 45 },
            { userId: 'host-1', kind: 'wallet_ledger_mismatch', actual: 10, expected: 12 },
            { userId: 'host-2', kind: 'wallet_ledger_mismatch', actual: -5, expected: 0 },
        ]);
    });

    it('returns host ids and stalled counts from raw rows', async () => {
        queryRaw.mockResolvedValueOnce([{ host_id: 'host-1' }, { host_id: 'host-2' }]);
        await expect(repository.listHostsWithMaturedFunds(new Date(), 5)).resolves.toEqual(['host-1', 'host-2']);

        queryRaw.mockResolvedValueOnce([{ total: BigInt(3) }]);
        await expect(repository.countStalledReleases(new Date())).resolves.toBe(3);
    });
});
