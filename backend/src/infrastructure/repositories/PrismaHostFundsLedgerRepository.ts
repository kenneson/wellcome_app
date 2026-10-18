import { prisma } from '../database/prismaClient';
import {
    BalanceInvariantViolation,
    HostFundsLedgerRepository,
} from '../../domain/repositories/HostFundsLedgerRepository';

export class PrismaHostFundsLedgerRepository implements HostFundsLedgerRepository {
    async listHostsWithMaturedFunds(now: Date, limit: number): Promise<string[]> {
        // Uses idx_payments_funds_release. The per-payment checks (provider settlement,
        // booking status) stay in PrismaPaymentRepository.releaseMaturedHostFunds.
        const rows = await prisma.$queryRaw<Array<{ host_id: string }>>`
            select distinct e.host_id::text as host_id
            from public.payments p
            join public.event_participants b on b.id = p.booking_id
            join public.events e on e.id = b.event_id
            where p.funds_held_at is not null
              and p.funds_released_at is null
              and p.funds_available_at <= ${now}
            order by host_id
            limit ${limit}
        `;
        return rows.map((row) => row.host_id);
    }

    async countStalledReleases(olderThan: Date): Promise<number> {
        const rows = await prisma.$queryRaw<Array<{ total: bigint | number }>>`
            select count(*) as total
            from public.payments p
            where p.funds_held_at is not null
              and p.funds_released_at is null
              and p.funds_available_at <= ${olderThan}
        `;
        return Number(rows[0]?.total ?? 0);
    }

    async findBalanceInvariantViolations(limit: number): Promise<BalanceInvariantViolation[]> {
        // pending_wallet_balance must equal the net value of held, unreleased payments;
        // wallet_balance must equal the sum of the user's wallet_transactions.
        const rows = await prisma.$queryRaw<Array<{
            user_id: string;
            pending_actual: string | number;
            pending_expected: string | number;
            wallet_actual: string | number;
            wallet_expected: string | number;
        }>>`
            with held as (
                select e.host_id,
                       sum(coalesce(p.net_amount, 0) - coalesce(p.refunded_net_amount, 0)) as expected
                from public.payments p
                join public.event_participants b on b.id = p.booking_id
                join public.events e on e.id = b.event_id
                where p.funds_held_at is not null
                  and p.funds_released_at is null
                group by e.host_id
            ),
            ledger as (
                select user_id, sum(amount) as total
                from public.wallet_transactions
                group by user_id
            )
            select pr.id::text as user_id,
                   pr.pending_wallet_balance as pending_actual,
                   coalesce(h.expected, 0) as pending_expected,
                   pr.wallet_balance as wallet_actual,
                   coalesce(l.total, 0) as wallet_expected
            from public.profiles pr
            left join held h on h.host_id = pr.id
            left join ledger l on l.user_id = pr.id
            where abs(pr.pending_wallet_balance - coalesce(h.expected, 0)) >= 0.01
               or abs(pr.wallet_balance - coalesce(l.total, 0)) >= 0.01
            order by pr.id
            limit ${limit}
        `;

        const violations: BalanceInvariantViolation[] = [];
        for (const row of rows) {
            const pendingActual = Number(row.pending_actual);
            const pendingExpected = Number(row.pending_expected);
            const walletActual = Number(row.wallet_actual);
            const walletExpected = Number(row.wallet_expected);
            if (Math.abs(pendingActual - pendingExpected) >= 0.01) {
                violations.push({
                    userId: row.user_id,
                    kind: 'pending_balance_mismatch',
                    actual: pendingActual,
                    expected: pendingExpected,
                });
            }
            if (Math.abs(walletActual - walletExpected) >= 0.01) {
                violations.push({
                    userId: row.user_id,
                    kind: 'wallet_ledger_mismatch',
                    actual: walletActual,
                    expected: walletExpected,
                });
            }
        }
        return violations;
    }
}
