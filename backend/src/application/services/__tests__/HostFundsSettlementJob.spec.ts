import { HostFundsSettlementJob, getSettlementIntervalMs } from '../HostFundsSettlementJob';
import { OpsAlerter } from '../OpsAlerter';

describe('HostFundsSettlementJob', () => {
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const now = new Date('2026-10-17T12:00:00.000Z');
    let payments: { releaseMaturedHostFunds: jest.Mock };
    let ledger: {
        listHostsWithMaturedFunds: jest.Mock;
        countStalledReleases: jest.Mock;
        findBalanceInvariantViolations: jest.Mock;
    };
    let alerter: { notify: jest.Mock };
    let job: HostFundsSettlementJob;

    beforeEach(() => {
        jest.clearAllMocks();
        payments = { releaseMaturedHostFunds: jest.fn().mockResolvedValue(0) };
        ledger = {
            listHostsWithMaturedFunds: jest.fn().mockResolvedValue([]),
            countStalledReleases: jest.fn().mockResolvedValue(0),
            findBalanceInvariantViolations: jest.fn().mockResolvedValue([]),
        };
        alerter = { notify: jest.fn().mockResolvedValue(true) };
        job = new HostFundsSettlementJob(payments, ledger, alerter as unknown as OpsAlerter, logger);
    });

    it('releases matured funds for every host without waiting for them to open the app', async () => {
        ledger.listHostsWithMaturedFunds.mockResolvedValue(['host-1', 'host-2']);
        payments.releaseMaturedHostFunds.mockResolvedValueOnce(90.1).mockResolvedValueOnce(45.25);

        const report = await job.run(now);

        expect(payments.releaseMaturedHostFunds).toHaveBeenNthCalledWith(1, 'host-1', now);
        expect(payments.releaseMaturedHostFunds).toHaveBeenNthCalledWith(2, 'host-2', now);
        expect(report).toEqual(expect.objectContaining({
            hostsProcessed: 2,
            releasedAmount: 135.35,
            releaseFailures: 0,
            violations: [],
        }));
        expect(alerter.notify).not.toHaveBeenCalled();
        expect(job.latestReport).toBe(report);
    });

    it('keeps going when one host fails and raises a critical alert for it', async () => {
        ledger.listHostsWithMaturedFunds.mockResolvedValue(['host-1', 'host-2']);
        payments.releaseMaturedHostFunds
            .mockRejectedValueOnce(new Error('Pending wallet balance invariant failed for payment p1'))
            .mockResolvedValueOnce(10);

        const report = await job.run(now);

        expect(report.releaseFailures).toBe(1);
        expect(report.releasedAmount).toBe(10);
        expect(alerter.notify).toHaveBeenCalledWith(expect.objectContaining({
            key: 'release_failed:host-1',
            severity: 'critical',
        }));
    });

    it('alerts on stalled releases older than 48h', async () => {
        ledger.countStalledReleases.mockResolvedValue(3);

        await job.run(now);

        expect(ledger.countStalledReleases).toHaveBeenCalledWith(new Date('2026-10-15T12:00:00.000Z'));
        expect(alerter.notify).toHaveBeenCalledWith(expect.objectContaining({
            key: 'release_stalled',
            severity: 'warning',
            details: { count: 3 },
        }));
    });

    it('alerts once per balance invariant violation', async () => {
        const violations = [
            { userId: 'host-1', kind: 'pending_balance_mismatch', actual: 100, expected: 90 },
            { userId: 'host-2', kind: 'wallet_ledger_mismatch', actual: -5, expected: 0 },
        ];
        ledger.findBalanceInvariantViolations.mockResolvedValue(violations);

        const report = await job.run(now);

        expect(report.violations).toEqual(violations);
        expect(alerter.notify).toHaveBeenCalledTimes(2);
        expect(alerter.notify).toHaveBeenCalledWith(expect.objectContaining({
            key: 'pending_balance_mismatch:host-1:100:90',
            title: 'Saldo retido diverge dos pagamentos retidos',
        }));
        expect(alerter.notify).toHaveBeenCalledWith(expect.objectContaining({
            key: 'wallet_ledger_mismatch:host-2:-5:0',
            title: 'Saldo da carteira diverge do extrato',
        }));
    });

    it('joins an in-flight run instead of starting a concurrent one', async () => {
        let resolveHosts!: (hosts: string[]) => void;
        ledger.listHostsWithMaturedFunds.mockReturnValue(new Promise((resolve) => { resolveHosts = resolve; }));

        const first = job.run(now);
        const second = job.run(now);
        resolveHosts([]);

        expect(await first).toBe(await second);
        expect(ledger.listHostsWithMaturedFunds).toHaveBeenCalledTimes(1);

        await job.run(now);
        expect(ledger.listHostsWithMaturedFunds).toHaveBeenCalledTimes(2);
    });

    it('reads the interval from the environment with a 1 minute floor', () => {
        expect(getSettlementIntervalMs(undefined)).toBe(600_000);
        expect(getSettlementIntervalMs('300000')).toBe(300_000);
        expect(getSettlementIntervalMs('10')).toBe(600_000);
        expect(getSettlementIntervalMs('abc')).toBe(600_000);
    });
});
