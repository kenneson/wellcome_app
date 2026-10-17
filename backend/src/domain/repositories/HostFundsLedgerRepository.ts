export interface BalanceInvariantViolation {
    userId: string;
    kind: 'pending_balance_mismatch' | 'wallet_ledger_mismatch';
    actual: number;
    expected: number;
}

export interface HostFundsLedgerRepository {
    /** Hosts that have at least one held payment whose release window has passed. */
    listHostsWithMaturedFunds(now: Date, limit: number): Promise<string[]>;
    /** Held payments still unreleased long after their window (e.g. provider never settled). */
    countStalledReleases(olderThan: Date): Promise<number>;
    findBalanceInvariantViolations(limit: number): Promise<BalanceInvariantViolation[]>;
}
