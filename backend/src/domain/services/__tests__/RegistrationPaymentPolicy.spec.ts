import { EventAccessType } from '../../value-objects/EventAccessType';
import { PaymentStatus } from '../../value-objects/PaymentStatus';
import { RegistrationStatus } from '../../value-objects/RegistrationStatus';
import {
    assertRegistrationCanPay,
    calculateRegistrationPaymentDueAt,
    registrationHoldsCapacity,
} from '../RegistrationPaymentPolicy';

describe('RegistrationPaymentPolicy', () => {
    it('reserves paid pending candidates even when their previous payment deadline expired', () => {
        expect(registrationHoldsCapacity({ accessType: EventAccessType.OPEN_WITH_APPROVAL, requiresApproval: true, price: 100 },
            { status: RegistrationStatus.PENDING, paymentStatus: PaymentStatus.CONFIRMED, paymentDueAt: new Date(0) })).toBe(true);
    });
    it.each([RegistrationStatus.REJECTED, RegistrationStatus.CANCELLED, RegistrationStatus.WAITLIST, RegistrationStatus.EXPIRED])('blocks payment for %s', (status) => {
        expect(() => assertRegistrationCanPay({ accessType: EventAccessType.OPEN_WITH_APPROVAL, requiresApproval: true }, { status })).toThrow('Booking is not eligible for payment');
    });
    const moderatedEvent = {
        accessType: EventAccessType.OPEN_WITH_APPROVAL,
        requiresApproval: true,
        price: 100,
        eventDate: new Date('2026-08-30T18:00:00.000Z'),
    };

    it('allows payment before approval in moderated events', () => {
        expect(() => assertRegistrationCanPay(moderatedEvent, {
            status: RegistrationStatus.PENDING,
        })).not.toThrow();
    });

    it('allows a pending paid registration in an open event', () => {
        expect(() => assertRegistrationCanPay({
            accessType: EventAccessType.OPEN,
            requiresApproval: false,
        }, {
            status: RegistrationStatus.PENDING,
        })).not.toThrow();
    });

    it('limits payment to the earlier of 24 hours or the event start', () => {
        const approvedAt = new Date('2026-08-30T12:00:00.000Z');
        expect(calculateRegistrationPaymentDueAt(moderatedEvent, approvedAt, 24))
            .toEqual(moderatedEvent.eventDate);
    });

    it('temporarily blocks checkout capacity but only reserves it after payment confirmation', () => {
        const now = new Date('2026-08-29T12:00:00.000Z');
        expect(registrationHoldsCapacity(moderatedEvent, {
            status: RegistrationStatus.PENDING,
        }, now)).toBe(false);
        expect(registrationHoldsCapacity(moderatedEvent, {
            status: RegistrationStatus.PENDING,
            paymentDueAt: new Date('2026-08-29T13:00:00.000Z'),
        }, now)).toBe(true);
        expect(registrationHoldsCapacity(moderatedEvent, {
            status: RegistrationStatus.PENDING,
            capacityHeldAt: new Date('2026-08-29T11:30:00.000Z'),
        }, now)).toBe(true);
        expect(registrationHoldsCapacity(moderatedEvent, {
            status: RegistrationStatus.APPROVED,
            paymentDueAt: new Date('2026-08-29T11:00:00.000Z'),
            paymentStatus: PaymentStatus.PENDING,
        }, now)).toBe(false);
        expect(registrationHoldsCapacity(moderatedEvent, {
            status: RegistrationStatus.APPROVED,
            paymentDueAt: new Date('2026-08-29T11:00:00.000Z'),
            paymentStatus: PaymentStatus.CONFIRMED,
        }, now)).toBe(true);
    });

    it('releases an unpaid open-event reservation after its payment deadline', () => {
        expect(registrationHoldsCapacity({
            accessType: EventAccessType.OPEN,
            requiresApproval: false,
            price: 100,
        }, {
            status: RegistrationStatus.PENDING,
            paymentDueAt: new Date('2026-08-29T11:00:00.000Z'),
            paymentStatus: PaymentStatus.PENDING,
        }, new Date('2026-08-29T12:00:00.000Z'))).toBe(false);
    });
});
