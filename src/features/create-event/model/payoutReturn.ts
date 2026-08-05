export const EVENT_CREATION_RETURN_ROUTE = '/events/create/settings';

function firstParam(value?: string | string[]) {
    return Array.isArray(value) ? value[0] : value;
}

export function getEventCreationReturnPath(
    returnTo?: string | string[],
    draftId?: string | string[],
): string | null {
    const route = firstParam(returnTo);
    const id = firstParam(draftId)?.trim();
    if (route !== EVENT_CREATION_RETURN_ROUTE || !id) return null;
    return `${EVENT_CREATION_RETURN_ROUTE}?draftId=${encodeURIComponent(id)}`;
}
