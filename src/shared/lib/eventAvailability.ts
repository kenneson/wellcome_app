type EventSchedule = {
    eventDate?: string | Date | null;
    event_date?: string | Date | null;
    reservationDeadline?: string | Date | null;
    reservation_deadline?: string | Date | null;
};

export function getEventStart(event: EventSchedule): Date | null {
    const value = event.eventDate ?? event.event_date;
    if (!value) return null;

    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
}

export function getRegistrationCutoff(event: EventSchedule): Date | null {
    const eventStart = getEventStart(event);
    if (!eventStart) return null;

    const deadlineValue = event.reservationDeadline ?? event.reservation_deadline;
    if (!deadlineValue) return eventStart;

    const deadline = new Date(deadlineValue);
    if (!Number.isFinite(deadline.getTime())) return eventStart;
    deadline.setHours(23, 59, 59, 999);

    return deadline < eventStart ? deadline : eventStart;
}

export function isEventRegistrationClosed(event: EventSchedule, now = new Date()): boolean {
    const cutoff = getRegistrationCutoff(event);
    return !cutoff || cutoff <= now;
}
