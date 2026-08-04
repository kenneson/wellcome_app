export const MIN_PAID_EVENT_PRICE = 5;

export const INVALID_EVENT_PRICE_MESSAGE =
    `Eventos pagos devem custar no minimo R$ ${MIN_PAID_EVENT_PRICE.toFixed(2).replace('.', ',')}. Para um evento gratuito, informe R$ 0,00.`;

export function parseEventPrice(value: string): number {
    const sanitized = value.replace(/^R\$\s*/i, '').replace(/\s/g, '');
    if (!sanitized) return Number.NaN;

    const normalized = sanitized.includes(',')
        ? sanitized.replace(/\./g, '').replace(',', '.')
        : sanitized;

    return Number(normalized);
}

export function isValidEventPrice(price: number): boolean {
    return Number.isFinite(price) && price >= 0 && (price === 0 || price >= MIN_PAID_EVENT_PRICE);
}
