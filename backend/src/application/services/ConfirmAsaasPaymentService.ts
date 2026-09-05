import { Payment } from '../../domain/entities/Payment';
import { EventRepository } from '../../domain/repositories/EventRepository';
import { PaymentRepository } from '../../domain/repositories/PaymentRepository';
import { ProviderPayment } from '../../domain/services/PaymentGateway';
import { isProviderPaymentPaid } from '../../domain/services/PaymentStatusPolicy';
import { calculateHostFundsAvailableAt } from '../../domain/services/HostFundsAvailabilityPolicy';
import { EventAccessType } from '../../domain/value-objects/EventAccessType';
import { NotificationType } from '../../domain/value-objects/NotificationType';
import { SendNotificationUseCase } from '../use-cases/SendNotificationUseCase';
import { ChatService } from './ChatService';
import {
    calculateSettlementEconomics,
    getProcessingFeePayer,
} from '../../domain/services/PaymentEconomics';

export class ConfirmAsaasPaymentService {
    constructor(
        private paymentRepository: PaymentRepository,
        private eventRepository: EventRepository,
        private sendNotificationUseCase: SendNotificationUseCase,
        private chatService?: ChatService
    ) {}

    async execute(payment: Payment, providerPayment: ProviderPayment): Promise<boolean> {
        if (!isProviderPaymentPaid(providerPayment)) {
            throw new Error(`Cobranca Asaas ${providerPayment.id} ainda nao esta confirmada`);
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
        const processorFeePayer = getProcessingFeePayer();
        const economics = calculateSettlementEconomics(
            payment.valor,
            platformFee,
            processorFee,
            processorFeePayer
        );
        const paidAtCandidate = providerPayment.paymentDate || providerPayment.confirmedDate;
        const paidAt = paidAtCandidate ? new Date(paidAtCandidate) : new Date();

        const confirmed = await this.paymentRepository.confirmAndHoldHostFunds({
            paymentId: payment.id,
            bookingId: payment.bookingId,
            hostId: event.hostId,
            platformFee,
            processorFee,
            processorFeePayer,
            platformMargin: economics.platformMargin,
            netAmount: economics.hostNetAmount,
            paidAt: Number.isNaN(paidAt.getTime()) ? new Date() : paidAt,
            providerStatus: providerPayment.status,
            approveBookingOnPayment: this.shouldApproveBookingOnPayment(event),
            fundsAvailableAt: calculateHostFundsAvailableAt(event),
        });

        const currentEvent = confirmed ? await this.eventRepository.findById(payment.eventId) : null;
        const booking = currentEvent?.bookings?.find((item) => item.id === payment.bookingId);
        const awaitingApproval = !this.shouldApproveBookingOnPayment(event) && booking?.status !== 'APPROVED';
        const ended = booking && ['REJECTED', 'CANCELLED', 'EXPIRED'].includes(booking.status);
        if (confirmed && event.host && !ended) {
            await this.sendNotificationUseCase.execute(
                event.host.id, event.host.expoPushToken || null,
                awaitingApproval ? 'Pagamento confirmado · aprovação pendente' : 'Inscrição confirmada',
                awaitingApproval
                    ? `Um participante pagou e reservou uma vaga em "${event.title}". Aprove ou recuse a participação. A recusa gera estorno integral.`
                    : `Um participante confirmou o pagamento para "${event.title}".`,
                awaitingApproval ? NotificationType.NEW_REGISTRATION_PENDING : NotificationType.NEW_REGISTRATION_CONFIRMED,
                { eventId: event.id }
            );
        }
        if (confirmed) {
            await this.sendNotificationUseCase.execute(
                payment.userId, null, ended ? 'Pagamento recebido · estorno pendente' : 'Pagamento confirmado',
                ended ? 'Sua inscrição está encerrada. O valor pago será devolvido integralmente.'
                    : awaitingApproval ? 'Sua vaga está reservada e aguarda aprovação do anfitrião. Se recusada, você receberá estorno integral.'
                    : 'Pagamento confirmado e ingresso disponível.',
                NotificationType.NEW_REGISTRATION_CONFIRMED, { eventId: event.id }
            );
            if (!ended) await this.chatService?.recordPaymentConfirmed(payment.bookingId).catch((error) =>
                console.error('Failed to record payment confirmation in chat', error)
            );
        }
        return confirmed;
    }

    private shouldApproveBookingOnPayment(event: { accessType?: EventAccessType; requiresApproval?: boolean }): boolean {
        return event.accessType === EventAccessType.OPEN && !event.requiresApproval;
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
