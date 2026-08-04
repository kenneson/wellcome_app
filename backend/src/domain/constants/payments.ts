export const MIN_PAID_EVENT_PRICE = 5;

export const INVALID_EVENT_PRICE_MESSAGE =
    `Eventos pagos devem custar no minimo R$ ${MIN_PAID_EVENT_PRICE.toFixed(2).replace('.', ',')} ou ser gratuitos`;

export function isValidEventPrice(price: number): boolean {
    return Number.isFinite(price) && price >= 0 && (price === 0 || price >= MIN_PAID_EVENT_PRICE);
}
