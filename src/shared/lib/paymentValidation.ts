export const onlyDigits = (value: string) => value.replace(/\D/g, '');

export function formatCpf(value: string): string {
    return onlyDigits(value)
        .slice(0, 11)
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function formatPhone(value: string): string {
    const digits = onlyDigits(value).slice(0, 11);
    if (digits.length <= 10) {
        return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
    }
    return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}

export function formatPostalCode(value: string): string {
    return onlyDigits(value).slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
}

export function formatCardNumber(value: string): string {
    return onlyDigits(value).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function detectCardBrand(value: string): string {
    const digits = onlyDigits(value);
    if (/^4/.test(digits)) return 'Visa';
    if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard';
    if (/^3[47]/.test(digits)) return 'American Express';
    if (/^(636368|438935|504175|451416|636297)/.test(digits)) return 'Elo';
    return 'Cartao';
}

export function displayCardBrand(brand: string): string {
    const normalized = brand.toUpperCase();
    if (normalized.includes('VISA')) return 'Visa';
    if (normalized.includes('MASTER')) return 'Mastercard';
    if (normalized.includes('AMEX') || normalized.includes('AMERICAN')) return 'American Express';
    if (normalized.includes('ELO')) return 'Elo';
    return 'Cartao';
}
