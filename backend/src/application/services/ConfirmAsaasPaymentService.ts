import { Payment } from '../../domain/entities/Payment';
import { EventRepository } from '../../domain/repositories/EventRepository';
import { PaymentRepository } from '../../domain/repositories/PaymentRepository';
import { ProviderPayment } from '../../domain/services/PaymentGateway';
import { isProviderPaymentSettled } from '../../domain/services/PaymentStatusPolicy';
import { NotificationType } from '../../domain/value-objects/NotificationType';
import { SendNotificationUseCase } from '../use-cases/SendNotificationUseCase';

export class ConfirmAsaasPaymentService {
    constructor(
        private paymentRepository: PaymentRepository,
        private eventRepository: EventRepository,
        private sendNotificationUseCase: SendNotificationUseCase
    ) {}

    async execute(payment: Payment, providerPayment: ProviderPayment): Promise<boolean> {
        if (!isProviderPaymentSettled(providerPayment)) {
            throw new Error(`Cobranca Asaas ${providerPayment.id} ainda nao esta liquidada`);
        }
        if (!this.sameMoney(providerPayment.value, payment.valor)) {
            throw new Error(`Valor divergente no pagamento Asaas ${providerPayment.id}`);
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
            Math.max(0, payment.valor - platformFee - (hostPaysProcessorFee ? processorFee : 0)).toFixed(2)
        );
        const paidAtCandidate = providerPayment.paymentDate || providerPayment.confirmedDate;
        const paidAt = paidAtCandidate ? new Date(paidAtCandidate) : new Date();

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
        return confirmed;
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

    private sameMoney(left: number, right: number): boolean {
        return Math.abs(Number(left) - Number(right)) < 0.005;
    }
}
