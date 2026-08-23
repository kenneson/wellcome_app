import { PaymentRepository } from '../../domain/repositories/PaymentRepository';
import { calculateRealizedPaymentEconomics } from '../../domain/services/PaymentEconomics';

export class GetPlatformEconomicsUseCase {
    constructor(private paymentRepository: PaymentRepository) {}

    async execute(limit = 100) {
        if (!this.paymentRepository.listSettledForEconomics) {
            throw new Error('Payment economics repository is not configured');
        }
        const payments = await this.paymentRepository.listSettledForEconomics(limit);
        const rows = payments.map(calculateRealizedPaymentEconomics);
        const totals = rows.reduce((summary, row) => ({
            grossCaptured: money(summary.grossCaptured + row.grossCaptured),
            grossRefunded: money(summary.grossRefunded + row.grossRefunded),
            grossRetained: money(summary.grossRetained + row.grossRetained),
            hostNetRetained: money(summary.hostNetRetained + row.hostNetRetained),
            realizedPlatformMargin: money(summary.realizedPlatformMargin + row.realizedPlatformMargin),
            processorCost: money(
                summary.processorCost
                + (row.processorFeePayer === 'PLATFORM'
                    ? row.processorFee - row.refundedProcessorFee
                    : 0)
            ),
        }), {
            grossCaptured: 0,
            grossRefunded: 0,
            grossRetained: 0,
            hostNetRetained: 0,
            realizedPlatformMargin: 0,
            processorCost: 0,
        });

        return {
            totals: {
                ...totals,
                realizedMarginPercentage: totals.grossRetained > 0
                    ? money((totals.realizedPlatformMargin / totals.grossRetained) * 100)
                    : null,
            },
            payments: rows,
        };
    }
}

function money(value: number): number {
    return Number(value.toFixed(2));
}
