export const MIN_PAID_EVENT_PRICE = 5;
export const MAX_EVENT_PRICE = 100_000;

export const INVALID_EVENT_PRICE_MESSAGE =
    `Eventos pagos devem custar entre R$ ${MIN_PAID_EVENT_PRICE.toFixed(2).replace('.', ',')} e R$ ${MAX_EVENT_PRICE.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Para um evento gratuito, informe R$ 0,00.`;

export function parseEventPrice(value: string): number {
    const sanitized = value.replace(/^R\$\s*/i, '').replace(/\s/g, '');
    if (!sanitized) return Number.NaN;

    const normalized = sanitized.includes(',')
        ? sanitized.replace(/\./g, '').replace(',', '.')
        : sanitized;

    return Number(normalized);
}

export function isValidEventPrice(price: number): boolean {
    return Number.isFinite(price) && price >= 0 && price <= MAX_EVENT_PRICE && (price === 0 || price >= MIN_PAID_EVENT_PRICE);
}

export function formatEventPriceInput(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (!digits) return '';
    const amount = Math.min(Number(digits) / 100, MAX_EVENT_PRICE);
    return amount.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}
