export function isEventInCity(location: string, city: string): boolean {
    const normalizedCity = normalizeLocationPart(city);
    if (!normalizedCity) return false;

    return location
        .split(',')
        .map(normalizeLocationPart)
        .some((part) =>
            part === normalizedCity ||
            part.startsWith(`${normalizedCity} - `) ||
            part === `municipio de ${normalizedCity}`
        );
}

function normalizeLocationPart(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
}
