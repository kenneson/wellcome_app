import { PaymentRepository } from '../../domain/repositories/PaymentRepository';
import { EventRepository } from '../../domain/repositories/EventRepository';
import { PaymentGateway } from '../../domain/services/PaymentGateway';

/** Terminal registrations are the durable refund queue, including late payments. */
export class RegistrationRefundService {
    constructor(
        private payments: PaymentRepository,
        private gateway: PaymentGateway,
        private events: EventRepository,
    ) {}

    async execute(paymentId: string): Promise<void> {
        if (!this.payments.withRegistrationRefundLock) throw new Error('Refund lock unavailable');
        const result = await this.payments.withRegistrationRefundLock(paymentId, async (payment) => {
            if (!payment.providerPaymentId) throw new Error('Missing provider payment reference');
            let remote = await this.gateway.getPayment(payment.providerPaymentId);
            const done = (remote.refunds || []).filter((r) => r.status === 'DONE').reduce((sum, r) => sum + r.value, 0);
            const pending = remote.status === 'REFUND_REQUESTED' || remote.status === 'REFUND_IN_PROGRESS'
                || (remote.refunds || []).some((r) => r.status === 'PENDING');
            if (!pending && remote.status !== 'REFUNDED' && done < payment.valor) {
                remote = await this.gateway.refundPayment(remote.id,
                    Number((payment.valor - Math.max(done, payment.refundedAmount || 0)).toFixed(2)),
                    'Inscrição encerrada. Devolução integral ao participante.');
            }
            const refunded = remote.status === 'REFUNDED' ? payment.valor
                : (remote.refunds || []).filter((r) => r.status === 'DONE').reduce((sum, r) => sum + r.value, 0);
            return { payment, remote, refunded };
        });
        if (!result || result.refunded <= 0) return;
        const event = await this.events.findById(result.payment.eventId);
        if (!event) throw new Error('Event not found');
        await this.payments.applyRefund({
            paymentId, hostId: event.hostId, refundedAmount: result.refunded,
            targetStatus: result.refunded >= result.payment.valor ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
            providerStatus: result.remote.status,
            referenceId: `registration-refund:${paymentId}:${result.refunded}`,
        });
    }

    async reconcile(): Promise<void> {
        const candidates = await this.payments.listRefundCandidates?.() || [];
        for (const payment of candidates) {
            try { await this.execute(payment.id); }
            catch (error) {
                console.error('Registration refund pending; will retry', { paymentId: payment.id, error: error instanceof Error ? error.message : 'Unknown error' });
            }
        }
    }
}
