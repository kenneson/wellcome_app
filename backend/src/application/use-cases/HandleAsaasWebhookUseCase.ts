import { EventRepository } from '../../domain/repositories/EventRepository';
import { PaymentRepository } from '../../domain/repositories/PaymentRepository';
import { WebhookEventRepository } from '../../domain/repositories/WebhookEventRepository';
import { WithdrawalRequestRepository } from '../../domain/repositories/WithdrawalRequestRepository';
import { PaymentGateway } from '../../domain/services/PaymentGateway';
import { NotificationType } from '../../domain/value-objects/NotificationType';
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
    constructor(
        private paymentGateway: PaymentGateway,
        private paymentRepository: PaymentRepository,
        private eventRepository: EventRepository,
        private withdrawalRepository: WithdrawalRequestRepository,
        private webhookEventRepository: WebhookEventRepository,
        private sendNotificationUseCase: SendNotificationUseCase
    ) {}

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

        const event = await this.eventRepository.findById(payment.eventId);
        if (!event?.hostId) throw new Error('Event host not found');

        const feePercentage = this.getAppFeePercentage();
        const platformFee = Number((payment.valor * feePercentage).toFixed(2));
        const providerValue = this.toFiniteMoney(providerPayment.value, payment.valor);
        const providerNetValue = this.toFiniteMoney(providerPayment.netValue, providerValue);
        const processorFee = Number(Math.max(0, providerValue - providerNetValue).toFixed(2));
        const hostPaysProcessorFee = process.env.PAYMENT_PROCESSING_FEE_PAYER === 'HOST';
        const netAmount = Number(
            Math.max(
                0,
                payment.valor - platformFee - (hostPaysProcessorFee ? processorFee : 0)
            ).toFixed(2)
        );
        const paidAt = providerPayment.paymentDate
            ? new Date(providerPayment.paymentDate)
            : new Date();

        const confirmed = await this.paymentRepository.confirmAndCreditHost({
            paymentId: payment.id,
            bookingId: payment.bookingId,
            hostId: event.hostId,
            platformFee,
            processorFee,
            netAmount,
            paidAt: Number.isNaN(paidAt.getTime()) ? new Date() : paidAt,
            providerStatus: providerPayment.status,
        });

        if (confirmed && event.host) {
            await this.sendNotificationUseCase.execute(
                event.host.id,
                event.host.expoPushToken || null,
                'Pagamento confirmado',
                `Um participante confirmou o pagamento para "${event.title}".`,
                NotificationType.NEW_REGISTRATION_CONFIRMED,
                { eventId: event.id }
            );
        }
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

    private getAppFeePercentage(): number {
        const percentage = Number(process.env.APP_FEE_PERCENTAGE || '10');
        if (!Number.isFinite(percentage)) return 0.1;
        return Math.min(100, Math.max(0, percentage)) / 100;
    }

    private toFiniteMoney(value: unknown, fallback: number): number {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
}
