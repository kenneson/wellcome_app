import { randomUUID } from 'crypto';
import { EventRegistrationRepository } from '../../domain/repositories/EventRegistrationRepository';
import { EventRepository } from '../../domain/repositories/EventRepository';
import { PaymentRepository } from '../../domain/repositories/PaymentRepository';
import { PaymentStatus } from '../../domain/value-objects/PaymentStatus';
import { PaymentGateway } from '../../domain/services/PaymentGateway';
import { INVALID_EVENT_PRICE_MESSAGE, MIN_PAID_EVENT_PRICE } from '../../domain/constants/payments';

export interface CreatePaymentCheckoutDTO {
    bookingId: string;
    eventId: string;
    userId: string;
}

export interface CreatePaymentCheckoutResult {
    paymentId: string;
    checkoutId: string;
    checkoutUrl: string;
    value: string;
    status: string;
    expiresInMinutes: number;
}

export class CreatePaymentCheckoutUseCase {
    constructor(
        private paymentGateway: PaymentGateway,
        private eventRepository: EventRepository,
        private eventRegistrationRepository: EventRegistrationRepository,
        private paymentRepository: PaymentRepository
    ) {}

    async execute(data: CreatePaymentCheckoutDTO): Promise<CreatePaymentCheckoutResult> {
        const event = await this.eventRepository.findById(data.eventId);
        if (!event) throw new Error('Event not found');

        const price = Number(event.price);
        if (!price || price <= 0) throw new Error('Event has no price set');
        if (price < MIN_PAID_EVENT_PRICE) throw new Error(INVALID_EVENT_PRICE_MESSAGE);

        const registration = await this.eventRegistrationRepository.findById(data.bookingId);
        if (!registration) throw new Error('Booking not found');
        if (registration.userId !== data.userId) {
            throw new Error('Booking does not belong to this user');
        }
        if (registration.eventId !== data.eventId) {
            throw new Error('Booking does not belong to this event');
        }

        let payment = await this.paymentRepository.findByBookingId(data.bookingId);
        if (payment?.status === PaymentStatus.CONFIRMED) {
            throw new Error('Payment already confirmed');
        }
        if (
            payment?.status === PaymentStatus.REFUNDED ||
            payment?.status === PaymentStatus.CHARGEBACK ||
            payment?.status === PaymentStatus.PARTIALLY_REFUNDED
        ) {
            throw new Error('Payment cannot be reopened');
        }

        if (payment?.checkoutUrl && payment.status === PaymentStatus.PENDING) {
            return this.toResult(payment);
        }

        if (!payment) {
            payment = await this.paymentRepository.create({
                bookingId: data.bookingId,
                eventId: data.eventId,
                userId: data.userId,
                txid: `asaas-pending-${randomUUID()}`,
                pixCopiaECola: '',
                qrcode: '',
                valor: price,
                provider: 'ASAAS',
                providerStatus: 'NEW',
            });
        }

        const claimed = await this.paymentRepository.claimCheckoutCreation(payment.id);
        if (!claimed) {
            const current = await this.paymentRepository.findByBookingId(data.bookingId);
            if (current?.checkoutUrl && current.status === PaymentStatus.PENDING) {
                return this.toResult(current);
            }
            throw new Error('Payment checkout is being created');
        }

        try {
            const checkout = await this.paymentGateway.createCheckout({
                externalReference: data.bookingId,
                eventId: data.eventId,
                eventTitle: event.title,
                value: price,
                callbackBaseUrl: this.getPublicApiUrl(),
            });

            const updated = await this.paymentRepository.saveCheckout({
                paymentId: payment.id,
                checkoutId: checkout.id,
                checkoutUrl: checkout.link,
                providerStatus: checkout.status,
            });

            return this.toResult(updated);
        } catch (error) {
            await this.paymentRepository.markCheckoutCreationFailed(payment.id);
            throw error;
        }
    }

    private toResult(payment: {
        id: string;
        txid: string;
        checkoutUrl?: string;
        valor: number;
        status: string;
    }): CreatePaymentCheckoutResult {
        if (!payment.checkoutUrl) throw new Error('Payment checkout is unavailable');

        return {
            paymentId: payment.id,
            checkoutId: payment.txid,
            checkoutUrl: payment.checkoutUrl,
            value: payment.valor.toFixed(2),
            status: payment.status,
            expiresInMinutes: this.getExpirationMinutes(),
        };
    }

    private getPublicApiUrl(): string {
        const publicApiUrl = process.env.PUBLIC_API_URL?.trim();
        if (!publicApiUrl?.startsWith('https://')) {
            throw new Error('PUBLIC_API_URL deve ser uma URL HTTPS publica');
        }
        return publicApiUrl;
    }

    private getExpirationMinutes(): number {
        const configured = Number(process.env.PAYMENT_CHECKOUT_EXPIRATION_MINUTES || '60');
        if (!Number.isFinite(configured)) return 60;
        return Math.min(1440, Math.max(10, Math.trunc(configured)));
    }
}
