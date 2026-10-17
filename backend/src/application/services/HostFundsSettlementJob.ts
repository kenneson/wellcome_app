import { HostFundsLedgerRepository, BalanceInvariantViolation } from '../../domain/repositories/HostFundsLedgerRepository';
import { PaymentRepository } from '../../domain/repositories/PaymentRepository';
import { OpsAlerter } from './OpsAlerter';
import { StructuredLogger } from './AuditTrail';

export interface SettlementReport {
    startedAt: string;
    finishedAt: string;
    hostsProcessed: number;
    releasedAmount: number;
    releaseFailures: number;
    stalledReleases: number;
    violations: BalanceInvariantViolation[];
}

const HOST_BATCH = 200;
const VIOLATION_LIMIT = 100;
const STALLED_AFTER_MS = 48 * 60 * 60 * 1000;

export function getSettlementIntervalMs(rawValue = process.env.HOST_FUNDS_SETTLEMENT_INTERVAL_MS): number {
    const parsed = Number(rawValue ?? 10 * 60 * 1000);
    if (!Number.isFinite(parsed) || parsed < 60_000) return 10 * 60 * 1000;
    return parsed;
}

/**
 * Releases matured host funds even when the host never opens the app (today
 * release only happens on profile load or withdrawal request), then checks the
 * balance invariants and raises alerts when they break.
 */
export class HostFundsSettlementJob {
    private running: Promise<SettlementReport> | null = null;
    private lastReport: SettlementReport | null = null;

    constructor(
        private payments: Pick<PaymentRepository, 'releaseMaturedHostFunds'>,
        private ledger: HostFundsLedgerRepository,
        private alerter: OpsAlerter,
        private logger: StructuredLogger
    ) {}

    get latestReport(): SettlementReport | null {
        return this.lastReport;
    }

    /** Runs once; a call while a run is in progress joins that run. */
    run(now = new Date()): Promise<SettlementReport> {
        if (!this.running) {
            this.running = this.execute(now).finally(() => {
                this.running = null;
            });
        }
        return this.running;
    }

    private async execute(now: Date): Promise<SettlementReport> {
        const startedAt = new Date().toISOString();
        let releasedAmount = 0;
        let releaseFailures = 0;

        const hosts = await this.ledger.listHostsWithMaturedFunds(now, HOST_BATCH);
        for (const hostId of hosts) {
            try {
                releasedAmount += await this.payments.releaseMaturedHostFunds(hostId, now);
            } catch (error) {
                releaseFailures += 1;
                await this.alerter.notify({
                    key: `release_failed:${hostId}`,
                    severity: 'critical',
                    title: 'Falha ao liberar saldo do anfitriao',
                    details: { hostId, error: error instanceof Error ? error.message : String(error) },
                });
            }
        }

        const stalledReleases = await this.ledger.countStalledReleases(new Date(now.getTime() - STALLED_AFTER_MS));
        if (stalledReleases > 0) {
            await this.alerter.notify({
                key: 'release_stalled',
                severity: 'warning',
                title: 'Pagamentos retidos ha mais de 48h apos a janela de liberacao',
                details: { count: stalledReleases },
            });
        }

        const violations = await this.ledger.findBalanceInvariantViolations(VIOLATION_LIMIT);
        for (const violation of violations) {
            await this.alerter.notify({
                key: `${violation.kind}:${violation.userId}:${violation.actual}:${violation.expected}`,
                severity: 'critical',
                title: violation.kind === 'pending_balance_mismatch'
                    ? 'Saldo retido diverge dos pagamentos retidos'
                    : 'Saldo da carteira diverge do extrato',
                details: { ...violation },
            });
        }

        const report: SettlementReport = {
            startedAt,
            finishedAt: new Date().toISOString(),
            hostsProcessed: hosts.length,
            releasedAmount: Number(releasedAmount.toFixed(2)),
            releaseFailures,
            stalledReleases,
            violations,
        };
        this.lastReport = report;
        this.logger.info(
            {
                job: 'host-funds-settlement',
                hostsProcessed: report.hostsProcessed,
                releasedAmount: report.releasedAmount,
                releaseFailures,
                stalledReleases,
                violations: violations.length,
            },
            'host funds settlement finished'
        );
        return report;
    }
}
