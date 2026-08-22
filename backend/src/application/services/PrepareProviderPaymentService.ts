import { randomUUID } from 'crypto';
import { Event } from '../../domain/entities/Event';
import { Payment } from '../../domain/entities/Payment';
import { BillingRepository } from '../../domain/repositories/BillingRepository';
import { EventRegistrationRepository } from '../../domain/repositories/EventRegistrationRepository';
import { EventRepository } from '../../domain/repositories/EventRepository';
import { PaymentRepository } from '../../domain/repositories/PaymentRepository';
import {
    PaymentGateway,
    PaymentGatewayError,
    ProviderPayment,
} from '../../domain/services/PaymentGateway';
import { PaymentStatus } from '../../domain/value-objects/PaymentStatus';
import { INVALID_EVENT_PRICE_MESSAGE, MIN_PAID_EVENT_PRICE } from '../../domain/constants/payments';
import { EnsureAsaasCustomerService } from './EnsureAsaasCustomerService';

export interface PrepareProviderPaymentInput {
    bookingId: string;
    eventId: string;
    userId: string;
}

export interface PreparedProviderPayment {
    payment: Payment;
    providerPayment: ProviderPayment;
    event: Event;
}

export class PrepareProviderPaymentService {
    private ensureCustomerService: EnsureAsaasCustomerService;

    constructor(
        private paymentGateway: PaymentGateway,
        private eventRepository: EventRepository,
        private registrationRepository: EventRegistrationRepository,
        private paymentRepository: PaymentRepository,
        private billingRepository: BillingRepository
    ) {
        this.ensureCustomerService = new EnsureAsaasCustomerService(billingRepository, paymentGateway);
    }

    async execute(input: PrepareProviderPaymentInput): Promise<PreparedProviderPayment> {
        const event = await this.eventRepository.findById(input.eventId);
        if (!event) throw new Error('Event not found');

        const price = Number(event.price);
        if (!price || price <= 0) throw new Error('Event has no price set');
        if (price < MIN_PAID_EVENT_PRICE) throw new Error(INVALID_EVENT_PRICE_MESSAGE);

        const registration = await this.registrationRepository.findById(input.bookingId);
        if (!registration) throw new Error('Booking not found');
        if (registration.userId !== input.userId) throw new Error('Booking does not belong to this user');
        if (registration.eventId !== input.eventId) throw new Error('Booking does not belong to this event');

        const billingProfile = await this.billingRepository.findProfileByUserId(input.userId);
        if (!billingProfile) throw new Error('Complete seus dados de cobranca');
        const synchronizedProfile = await this.ensureCustomerService.execute(billingProfile, true);
        if (!synchronizedProfile.asaasCustomerId) throw new Error('Cliente Asaas indisponivel');

        let payment = await this.paymentRepository.findByBookingId(input.bookingId);
        this.assertPaymentCanContinue(payment);

        if (payment?.checkoutUrl) {
            await this.cancelLegacyCheckout(payment);
            await this.paymentRepository.resetForProviderPayment(payment.id);
            payment = await this.paymentRepository.findByBookingId(input.bookingId);
        }

        if (payment?.providerPaymentId) {
            const existing = await this.getExistingProviderPayment(payment);
            if (existing) {
                if (this.isPaid(existing.status) || this.sameMoney(existing.value, price)) {
                    return { payment, providerPayment: existing, event };
                }

                await this.paymentGateway.deletePayment(existing.id);
                await this.paymentRepository.resetForProviderPayment(payment.id);
                payment = await this.paymentRepository.findByBookingId(input.bookingId);
            }
        }

        if (!payment) {
            payment = await this.paymentRepository.create({
                bookingId: input.bookingId,
                eventId: input.eventId,
                userId: input.userId,
                txid: `asaas-pending-${randomUUID()}`,
                pixCopiaECola: '',
                qrcode: '',
                valor: price,
                provider: 'ASAAS',
                providerStatus: 'NEW',
            });
        }

        const claimed = await this.paymentRepository.claimProviderPaymentCreation(payment.id, price);
        if (!claimed) {
            const current = await this.paymentRepository.findByBookingId(input.bookingId);
            if (current?.providerPaymentId) {
                const providerPayment = await this.paymentGateway.getPayment(current.providerPaymentId);
                return { payment: current, providerPayment, event };
            }
            throw new Error('Payment is being created');
        }

        try {
            const providerPayment = await this.paymentGateway.createPayment({
                customerId: synchronizedProfile.asaasCustomerId,
                value: price,
                dueDate: this.todayInSaoPaulo(),
                description: `Ingresso - ${event.title}`,
                externalReference: input.bookingId,
            });
            const saved = await this.paymentRepository.saveProviderPayment({
                paymentId: payment.id,
                providerPaymentId: providerPayment.id,
                providerStatus: providerPayment.status,
                value: price,
            });
            return { payment: saved, providerPayment, event };
        } catch (error) {
            await this.paymentRepository.markCheckoutCreationFailed(payment.id);
            throw error;
        }
    }

    private assertPaymentCanContinue(payment: Payment | null): void {
        if (!payment) return;
        if (payment.status === PaymentStatus.CONFIRMED) throw new Error('Payment already confirmed');
        if (
            payment.status === PaymentStatus.REFUNDED ||
            payment.status === PaymentStatus.CHARGEBACK ||
            payment.status === PaymentStatus.PARTIALLY_REFUNDED
        ) {
            throw new Error('Payment cannot be reopened');
        }
    }

    private async cancelLegacyCheckout(payment: Payment): Promise<void> {
        const providerPayments = await this.paymentGateway.listCheckoutPayments(payment.txid);
        if (providerPayments.some((item) => this.isPaid(item.status))) {
            throw new Error('Payment already confirmed');
        }

        try {
            await this.paymentGateway.cancelCheckout(payment.txid);
        } catch (error) {
            if (!(error instanceof PaymentGatewayError) || ![400, 404].includes(error.statusCode || 0)) {
                throw error;
            }
            for (const providerPayment of providerPayments) {
                if (['PENDING', 'OVERDUE'].includes(providerPayment.status)) {
                    await this.paymentGateway.deletePayment(providerPayment.id);
                }
            }
        }
    }

    private async getExistingProviderPayment(payment: Payment): Promise<ProviderPayment | null> {
        try {
            const providerPayment = await this.paymentGateway.getPayment(payment.providerPaymentId!);
            if (['DELETED', 'REFUNDED', 'REFUND_REQUESTED', 'CHARGEBACK_REQUESTED'].includes(providerPayment.status)) {
                await this.paymentRepository.resetForProviderPayment(payment.id);
                return null;
            }
            if (providerPayment.status === 'OVERDUE') {
                await this.paymentGateway.deletePayment(providerPayment.id);
                await this.paymentRepository.resetForProviderPayment(payment.id);
                return null;
            }
            return providerPayment;
        } catch (error) {
            if (error instanceof PaymentGatewayError && error.statusCode === 404) {
                await this.paymentRepository.resetForProviderPayment(payment.id);
                return null;
            }
            throw error;
        }
    }

    private isPaid(status: string): boolean {
        return ['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH'].includes(status);
    }

    private sameMoney(left: number, right: number): boolean {
        return Math.abs(Number(left) - Number(right)) < 0.005;
    }

    private todayInSaoPaulo(): string {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(new Date());
    }
}
