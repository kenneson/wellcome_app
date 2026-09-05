import { Event } from '../entities/Event';
import { EventRegistration } from '../entities/EventRegistration';
import { EventAccessType } from '../value-objects/EventAccessType';
import { PaymentStatus } from '../value-objects/PaymentStatus';
import { RegistrationStatus } from '../value-objects/RegistrationStatus';

export const DEFAULT_REGISTRATION_PAYMENT_TTL_HOURS = 24;

export class RegistrationPaymentWindowExpiredError extends Error {
    constructor() {
        super('Registration payment window expired');
        this.name = 'RegistrationPaymentWindowExpiredError';
    }
}

export class RegistrationNotEligibleForPaymentError extends Error {
    constructor() {
        super('Booking is not eligible for payment');
        this.name = 'RegistrationNotEligibleForPaymentError';
    }
}

export function eventRequiresHostApproval(
    event: Pick<Event, 'accessType' | 'requiresApproval'>
): boolean {
    return event.accessType === EventAccessType.OPEN_WITH_APPROVAL || Boolean(event.requiresApproval);
}

export function getRegistrationPaymentTtlHours(
    rawValue = process.env.REGISTRATION_PAYMENT_TTL_HOURS
): number {
    const parsed = Number(rawValue ?? DEFAULT_REGISTRATION_PAYMENT_TTL_HOURS);
    if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_REGISTRATION_PAYMENT_TTL_HOURS;
    return Math.min(parsed, 24 * 7);
}

export function calculateRegistrationPaymentDueAt(
    event: Pick<Event, 'eventDate'>,
    approvedAt = new Date(),
    ttlHours = getRegistrationPaymentTtlHours()
): Date {
    const ttlDeadline = new Date(approvedAt.getTime() + ttlHours * 60 * 60 * 1000);
    const eventStart = new Date(event.eventDate);
    if (Number.isNaN(eventStart.getTime())) throw new Error('Invalid event date');
    return eventStart < ttlDeadline ? eventStart : ttlDeadline;
}

export function assertRegistrationCanPay(
    event: Pick<Event, 'accessType' | 'requiresApproval'>,
    registration: Pick<EventRegistration, 'status' | 'paymentDueAt'>,
    now = new Date()
): void {
    if (
        registration.status === RegistrationStatus.REJECTED ||
        registration.status === RegistrationStatus.CANCELLED ||
        registration.status === RegistrationStatus.EXPIRED ||
        registration.status === RegistrationStatus.WAITLIST
    ) {
        throw new RegistrationNotEligibleForPaymentError();
    }
    if (registration.paymentDueAt && new Date(registration.paymentDueAt).getTime() <= now.getTime()) {
        throw new RegistrationPaymentWindowExpiredError();
    }
}

export function registrationHoldsCapacity(
    event: Pick<Event, 'accessType' | 'requiresApproval' | 'price'>,
    registration: Pick<EventRegistration, 'status' | 'paymentDueAt' | 'paymentStatus' | 'capacityHeldAt'>,
    now = new Date()
): boolean {
    if (registration.status === RegistrationStatus.APPROVED) {
        const isPaid = Number(event.price) > 0;
        const paymentConfirmed =
            registration.paymentStatus === PaymentStatus.CONFIRMED ||
            registration.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED;
        const paymentExpired = registration.paymentDueAt
            && new Date(registration.paymentDueAt).getTime() <= now.getTime();
        return !isPaid || paymentConfirmed || !paymentExpired;
    }
    const pendingPaymentExpired = registration.paymentDueAt
        && new Date(registration.paymentDueAt).getTime() <= now.getTime();
    return (
        registration.status === RegistrationStatus.PENDING &&
        (
            registration.paymentStatus === PaymentStatus.CONFIRMED
            || registration.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED
            ||
            Boolean(registration.capacityHeldAt)
            || (
                Number(event.price) > 0
                && Boolean(registration.paymentDueAt)
                && !pendingPaymentExpired
            )
        )
    );
}
