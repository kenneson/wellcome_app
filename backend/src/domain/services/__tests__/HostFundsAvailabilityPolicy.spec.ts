import {
    DEFAULT_HOST_FUNDS_HOLD_HOURS,
    calculateHostFundsAvailableAt,
    getHostFundsHoldHours,
} from '../HostFundsAvailabilityPolicy';

describe('HostFundsAvailabilityPolicy', () => {
    const eventDate = new Date('2026-08-24T18:00:00.000Z');
    const endTime = new Date('2026-08-24T22:00:00.000Z');

    it('releases funds 24 hours after the explicit event end by default', () => {
        expect(calculateHostFundsAvailableAt({ eventDate, endTime }, DEFAULT_HOST_FUNDS_HOLD_HOURS))
            .toEqual(new Date('2026-08-25T22:00:00.000Z'));
    });

    it('uses the event start when no end time exists', () => {
        expect(calculateHostFundsAvailableAt({ eventDate, endTime: null }, 24))
            .toEqual(new Date('2026-08-25T18:00:00.000Z'));
    });

    it('falls back to 24 hours for invalid configuration', () => {
        expect(getHostFundsHoldHours('invalid')).toBe(DEFAULT_HOST_FUNDS_HOLD_HOURS);
        expect(getHostFundsHoldHours('-1')).toBe(DEFAULT_HOST_FUNDS_HOLD_HOURS);
    });
});
