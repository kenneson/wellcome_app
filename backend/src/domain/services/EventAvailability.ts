type EventSchedule = {
    eventDate: Date | string;
    reservationDeadline?: Date | string | null;
};

export function getRegistrationCutoff(event: EventSchedule): Date {
    const eventStart = new Date(event.eventDate);
    if (!event.reservationDeadline) return eventStart;

    const deadline = new Date(event.reservationDeadline);
    deadline.setHours(23, 59, 59, 999);

    return deadline < eventStart ? deadline : eventStart;
}

export function isEventOpenForRegistration(event: EventSchedule, now = new Date()): boolean {
    const cutoff = getRegistrationCutoff(event);
    return Number.isFinite(cutoff.getTime()) && cutoff > now;
}
