import { EventRepository } from '../../domain/repositories/EventRepository';
import { PaymentRepository } from '../../domain/repositories/PaymentRepository';
import { WebhookEventRepository } from '../../domain/repositories/WebhookEventRepository';
import { WithdrawalRequestRepository } from '../../domain/repositories/WithdrawalRequestRepository';
import { PaymentGateway, ProviderPayment } from '../../domain/services/PaymentGateway';
import { isProviderPaymentSettled } from '../../domain/services/PaymentStatusPolicy';
import { ConfirmAsaasPaymentService } from '../services/ConfirmAsaasPaymentService';
import { SendNotificationUseCase } from './SendNotificationUseCase';

export interface AsaasWebhookPayload {
    id: string;
    event: string;
    checkout?: {
        id: string;
        status?: string;
    };
    payment?: {
        id: string;
        status?: string;
        value?: number;
        netValue?: number;
        billingType?: string;
        externalReference?: string | null;
        paymentDate?: string | null;
        confirmedDate?: string | null;
        checkoutSession?: string | null;
        refunds?: Array<{
            status?: string;
            value?: number;
        }>;
    };
    transfer?: {
        id: string;
        status?: string;
        endToEndIdentifier?: string | null;
    };
    [key: string]: unknown;
}

export interface HandleWebhookResult {
    duplicate: boolean;
    action: string;
}

export class HandleAsaasWebhookUseCase {
    private confirmPaymentService: ConfirmAsaasPaymentService;

    constructor(
        private paymentGateway: PaymentGateway,
        private paymentRepository: PaymentRepository,
        private eventRepository: EventRepository,
        private withdrawalRepository: WithdrawalRequestRepository,
        private webhookEventRepository: WebhookEventRepository,
        private sendNotificationUseCase: SendNotificationUseCase
    ) {
        this.confirmPaymentService = new ConfirmAsaasPaymentService(
            paymentRepository,
            eventRepository,
            sendNotificationUseCase
        );
    }

    async execute(payload: AsaasWebhookPayload): Promise<HandleWebhookResult> {
        const shouldProcess = await this.webhookEventRepository.startProcessing({
            id: payload.id,
            provider: 'ASAAS',
            eventType: payload.event,
            payload,
        });

        if (!shouldProcess) {
            return { duplicate: true, action: 'ignored' };
        }

        try {
            const action = await this.process(payload);
            await this.webhookEventRepository.markProcessed(payload.id);
            return { duplicate: false, action };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown webhook processing error';
            await this.webhookEventRepository.markFailed(payload.id, message);
            throw error;
        }
    }

    private async process(payload: AsaasWebhookPayload): Promise<string> {
        switch (payload.event) {
            case 'CHECKOUT_PAID':
                await this.confirmCheckout(payload);
                return 'payment_confirmed';
            case 'PAYMENT_CONFIRMED':
            case 'PAYMENT_RECEIVED':
                return await this.confirmProviderPayment(payload)
                    ? 'payment_confirmed'
                    : 'payment_awaiting_settlement';
            case 'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED':
            case 'PAYMENT_REPROVED_BY_RISK_ANALYSIS':
                await this.recordProviderFailure(payload);
                return 'payment_refused';
            case 'PAYMENT_OVERDUE':
            case 'PAYMENT_DELETED':
                await this.expireProviderPayment(payload);
                return 'payment_expired';
            case 'CHECKOUT_CANCELED':
            case 'CHECKOUT_EXPIRED':
                await this.expireCheckout(payload);
                return 'payment_expired';
            case 'PAYMENT_REFUNDED':
                await this.applyPaymentRefund(payload, 'REFUNDED');
                return 'payment_refunded';
            case 'PAYMENT_PARTIALLY_REFUNDED':
                await this.applyPaymentRefund(payload, 'PARTIALLY_REFUNDED');
                return 'payment_partially_refunded';
            case 'PAYMENT_CHARGEBACK_REQUESTED':
                await this.applyPaymentRefund(payload, 'CHARGEBACK');
                return 'payment_chargeback';
            case 'TRANSFER_DONE':
                await this.completeTransfer(payload);
                return 'transfer_completed';
            case 'TRANSFER_FAILED':
            case 'TRANSFER_CANCELLED':
                await this.failTransfer(payload);
                return 'transfer_failed';
            default:
                return 'ignored';
        }
    }

    private async confirmCheckout(payload: AsaasWebhookPayload): Promise<void> {
        const checkoutId = payload.checkout?.id;
        if (!checkoutId) throw new Error('Checkout ID ausente no webhook');

        const payment = await this.paymentRepository.findByTxid(checkoutId);
        if (!payment) throw new Error(`Pagamento local nao encontrado para checkout ${checkoutId}`);

        const providerPayments = await this.paymentGateway.listCheckoutPayments(checkoutId);
        const providerPayment =
            providerPayments.find((item) => item.externalReference === payment.bookingId) ||
            providerPayments[0];
        if (!providerPayment) {
            throw new Error(`Cobranca Asaas ainda nao disponivel para checkout ${checkoutId}`);
        }

        await this.paymentRepository.updateProviderPayment({
            paymentId: payment.id,
            providerPaymentId: providerPayment.id,
            paymentMethod: providerPayment.billingType,
            providerStatus: providerPayment.status,
        });
        await this.confirmPaymentService.execute(payment, providerPayment as ProviderPayment);
    }

    private async confirmProviderPayment(payload: AsaasWebhookPayload): Promise<boolean> {
        const providerPaymentId = payload.payment?.id;
        if (!providerPaymentId) throw new Error('Payment ID ausente no webhook');

        const payment = await this.paymentRepository.findByProviderPaymentId(providerPaymentId);
        if (!payment) return false;

        const providerPayment = await this.paymentGateway.getPayment(providerPaymentId);
        if (!isProviderPaymentSettled(providerPayment)) {
            await this.paymentRepository.updateProviderPayment({
                paymentId: payment.id,
                providerPaymentId,
                paymentMethod: providerPayment.billingType,
                providerStatus: providerPayment.status,
            });
            if (providerPayment.billingType === 'PIX' && providerPayment.status === 'CONFIRMED') {
                return false;
            }
            throw new Error(`Cobranca Asaas ${providerPaymentId} ainda nao esta confirmada`);
        }
        await this.confirmPaymentService.execute(payment, providerPayment);
        return true;
    }

    private async recordProviderFailure(payload: AsaasWebhookPayload): Promise<void> {
        const providerPaymentId = payload.payment?.id;
        if (!providerPaymentId) throw new Error('Payment ID ausente no webhook');
        const payment = await this.paymentRepository.findByProviderPaymentId(providerPaymentId);
        if (!payment) return;

        await this.paymentRepository.updateProviderPayment({
            paymentId: payment.id,
            providerPaymentId,
            paymentMethod: payload.payment?.billingType || payment.paymentMethod || 'CREDIT_CARD',
            providerStatus: payload.payment?.status || payload.event,
        });
    }

    private async expireProviderPayment(payload: AsaasWebhookPayload): Promise<void> {
        const providerPaymentId = payload.payment?.id;
        if (!providerPaymentId) throw new Error('Payment ID ausente no webhook');
        await this.paymentRepository.expirePendingByTxid(
            providerPaymentId,
            payload.payment?.status || payload.event
        );
    }

    private async expireCheckout(payload: AsaasWebhookPayload): Promise<void> {
        const checkoutId = payload.checkout?.id;
        if (!checkoutId) throw new Error('Checkout ID ausente no webhook');
        await this.paymentRepository.expirePendingByTxid(
            checkoutId,
            payload.checkout?.status || payload.event
        );
    }

    private async applyPaymentRefund(
        payload: AsaasWebhookPayload,
        targetStatus: 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'CHARGEBACK'
    ): Promise<void> {
        const providerPaymentId = payload.payment?.id;
        if (!providerPaymentId) throw new Error('Payment ID ausente no webhook');

        const payment = await this.paymentRepository.findByProviderPaymentId(providerPaymentId);
        if (!payment) return;

        const event = await this.eventRepository.findById(payment.eventId);
        if (!event?.hostId) throw new Error('Event host not found');

        const refundedAmount = targetStatus === 'CHARGEBACK'
            ? payment.valor
            : this.getCompletedRefundAmount(payload, payment.valor, targetStatus === 'REFUNDED');

        if (refundedAmount <= 0) {
            throw new Error(`Valor do estorno ausente no webhook ${payload.id}`);
        }

        await this.paymentRepository.applyRefund({
            paymentId: payment.id,
            hostId: event.hostId,
            refundedAmount,
            targetStatus,
            providerStatus: payload.payment?.status || payload.event,
            referenceId: payload.id,
        });
    }

    private async completeTransfer(payload: AsaasWebhookPayload): Promise<void> {
        const transferId = payload.transfer?.id;
        if (!transferId) throw new Error('Transfer ID ausente no webhook');
        await this.withdrawalRepository.completeByProviderTransferId(
            transferId,
            payload.transfer?.endToEndIdentifier || undefined
        );
    }

    private async failTransfer(payload: AsaasWebhookPayload): Promise<void> {
        const transferId = payload.transfer?.id;
        if (!transferId) throw new Error('Transfer ID ausente no webhook');
        await this.withdrawalRepository.failAndRefundByProviderTransferId(transferId);
    }

    private getCompletedRefundAmount(
        payload: AsaasWebhookPayload,
        paymentValue: number,
        fullRefund: boolean
    ): number {
        if (fullRefund) return paymentValue;

        return Number(
            (payload.payment?.refunds || [])
                .filter((refund) => refund.status === 'DONE')
                .reduce((total, refund) => total + Number(refund.value || 0), 0)
                .toFixed(2)
        );
    }

}
