export const MIN_PAID_EVENT_PRICE = 5;
export const MAX_EVENT_PRICE = 100_000;

export const INVALID_EVENT_PRICE_MESSAGE =
    `Eventos pagos devem custar entre R$ ${MIN_PAID_EVENT_PRICE.toFixed(2).replace('.', ',')} e R$ ${MAX_EVENT_PRICE.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, ou ser gratuitos`;

export function isValidEventPrice(price: number): boolean {
    return Number.isFinite(price) && price >= 0 && price <= MAX_EVENT_PRICE && (price === 0 || price >= MIN_PAID_EVENT_PRICE);
}
