import { Event } from '../entities/Event';

export const DEFAULT_HOST_FUNDS_HOLD_HOURS = 24;

export function getHostFundsHoldHours(rawValue = process.env.HOST_FUNDS_HOLD_HOURS): number {
    const parsed = Number(rawValue ?? DEFAULT_HOST_FUNDS_HOLD_HOURS);
    if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_HOST_FUNDS_HOLD_HOURS;
    return Math.min(parsed, 24 * 30);
}

export function calculateHostFundsAvailableAt(
    event: Pick<Event, 'eventDate' | 'endTime'>,
    holdHours = getHostFundsHoldHours()
): Date {
    const eventEnd = event.endTime ?? event.eventDate;
    const eventEndTime = new Date(eventEnd).getTime();
    if (Number.isNaN(eventEndTime)) throw new Error('Invalid event end date');
    return new Date(eventEndTime + holdHours * 60 * 60 * 1000);
}
