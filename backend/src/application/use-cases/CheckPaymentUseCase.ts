import { EventRepository } from '../../domain/repositories/EventRepository';
import { PaymentRepository } from '../../domain/repositories/PaymentRepository';
import { PaymentGateway, ProviderPayment } from '../../domain/services/PaymentGateway';
import { isProviderPaymentSettled } from '../../domain/services/PaymentStatusPolicy';
import { PaymentStatus } from '../../domain/value-objects/PaymentStatus';
import { ConfirmAsaasPaymentService } from '../services/ConfirmAsaasPaymentService';
import { SendNotificationUseCase } from './SendNotificationUseCase';

export interface CheckPaymentResult {
    paymentId: string;
    checkoutId: string;
    checkoutUrl?: string;
    status: string;
    providerStatus?: string;
    paymentMethod?: string;
    pixExpirationDate?: string;
    paid: boolean;
}

type LocalPayment = NonNullable<Awaited<ReturnType<PaymentRepository['findByBookingId']>>>;

export class CheckPaymentUseCase {
    private confirmPaymentService?: ConfirmAsaasPaymentService;

    constructor(
        private paymentRepository: PaymentRepository,
        private paymentGateway?: PaymentGateway,
        private eventRepository?: EventRepository,
        private sendNotificationUseCase?: SendNotificationUseCase
    ) {
        if (paymentGateway && eventRepository && sendNotificationUseCase) {
            this.confirmPaymentService = new ConfirmAsaasPaymentService(
                paymentRepository,
                eventRepository,
                sendNotificationUseCase
            );
        }
    }

    async execute(bookingId: string, userId: string): Promise<CheckPaymentResult> {
        let payment = await this.paymentRepository.findByBookingId(bookingId);
        if (!payment) throw new Error('Payment not found for this booking');
        if (payment.userId !== userId) {
            throw new Error('Payment does not belong to this user');
        }

        payment = await this.reconcilePendingProviderPayment(payment);

        return {
            paymentId: payment.id,
            checkoutId: payment.txid,
            checkoutUrl: payment.checkoutUrl,
            status: payment.status,
            providerStatus: payment.providerStatus,
            paymentMethod: payment.paymentMethod,
            pixExpirationDate: payment.pixExpirationDate?.toISOString(),
            paid:
                payment.status === PaymentStatus.CONFIRMED ||
                payment.status === PaymentStatus.PARTIALLY_REFUNDED,
        };
    }

    private async reconcilePendingProviderPayment(payment: LocalPayment): Promise<LocalPayment> {
        if (payment.status !== PaymentStatus.PENDING || !this.paymentGateway || !this.confirmPaymentService) {
            return payment;
        }

        try {
            const providerPayment = await this.findProviderPayment(payment);
            if (!providerPayment) return payment;

            const updated = await this.paymentRepository.updateProviderPayment({
                paymentId: payment.id,
                providerPaymentId: providerPayment.id,
                paymentMethod: providerPayment.billingType,
                providerStatus: providerPayment.status,
            });

            if (!isProviderPaymentSettled(providerPayment)) return updated;

            await this.confirmPaymentService.execute(payment, providerPayment);
            return {
                ...updated,
                status: PaymentStatus.CONFIRMED,
                providerStatus: providerPayment.status,
                paymentMethod: providerPayment.billingType,
                providerPaymentId: providerPayment.id,
                paidAt: this.parseProviderPaidAt(providerPayment),
            };
        } catch {
            return payment;
        }
    }

    private async findProviderPayment(payment: LocalPayment): Promise<ProviderPayment | null> {
        if (payment.providerPaymentId) {
            return this.paymentGateway!.getPayment(payment.providerPaymentId);
        }

        const providerPayments = await this.paymentGateway!.listCheckoutPayments(payment.txid);
        return (
            providerPayments.find((item) => item.externalReference === payment.bookingId) ||
            providerPayments[0] ||
            null
        ) as ProviderPayment | null;
    }

    private parseProviderPaidAt(providerPayment: ProviderPayment): Date | undefined {
        const paidAtCandidate = providerPayment.paymentDate || providerPayment.confirmedDate;
        if (!paidAtCandidate) return undefined;

        const paidAt = new Date(paidAtCandidate);
        return Number.isNaN(paidAt.getTime()) ? undefined : paidAt;
    }
}
