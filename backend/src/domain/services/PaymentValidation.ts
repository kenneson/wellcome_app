export function onlyDigits(value: string): string {
    return value.replace(/\D/g, '');
}

export function isValidCpfCnpj(value: string): boolean {
    const digits = onlyDigits(value);
    if (/^(\d)\1+$/.test(digits)) return false;
    if (digits.length === 11) return isValidCpf(digits);
    if (digits.length === 14) return isValidCnpj(digits);
    return false;
}

export function isValidCardNumber(value: string): boolean {
    const digits = onlyDigits(value);
    if (digits.length < 13 || digits.length > 19 || /^(\d)\1+$/.test(digits)) return false;

    let sum = 0;
    let doubleDigit = false;
    for (let index = digits.length - 1; index >= 0; index -= 1) {
        let digit = Number(digits[index]);
        if (doubleDigit) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
        doubleDigit = !doubleDigit;
    }
    return sum % 10 === 0;
}

export function isValidCardExpiry(month: number, year: number, now = new Date()): boolean {
    if (!Number.isInteger(month) || month < 1 || month > 12) return false;
    if (!Number.isInteger(year) || year < 2000 || year > 2200) return false;
    const currentMonth = now.getUTCMonth() + 1;
    const currentYear = now.getUTCFullYear();
    return year > currentYear || (year === currentYear && month >= currentMonth);
}

function isValidCpf(value: string): boolean {
    const calculateDigit = (length: number) => {
        let sum = 0;
        for (let index = 0; index < length; index += 1) {
            sum += Number(value[index]) * (length + 1 - index);
        }
        const remainder = (sum * 10) % 11;
        return remainder === 10 ? 0 : remainder;
    };

    return calculateDigit(9) === Number(value[9]) && calculateDigit(10) === Number(value[10]);
}

function isValidCnpj(value: string): boolean {
    const calculateDigit = (baseLength: number) => {
        const weights = baseLength === 12
            ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
            : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        const sum = weights.reduce((total, weight, index) => total + Number(value[index]) * weight, 0);
        const remainder = sum % 11;
        return remainder < 2 ? 0 : 11 - remainder;
    };

    return calculateDigit(12) === Number(value[12]) && calculateDigit(13) === Number(value[13]);
}
