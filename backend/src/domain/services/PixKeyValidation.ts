export type PixKeyType = 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP';

export class InvalidPixKeyError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidPixKeyError';
    }
}

export interface NormalizedPixKey {
    key: string;
    type: PixKeyType;
}

export function normalizePixKey(key: string, type: string | null | undefined): NormalizedPixKey {
    const normalizedType = normalizePixKeyType(type);
    if (!normalizedType) throw new InvalidPixKeyError('Tipo de chave Pix invalido');

    const trimmedKey = key.trim();
    if (!trimmedKey) throw new InvalidPixKeyError('Chave Pix obrigatoria');

    switch (normalizedType) {
        case 'CPF': {
            const digits = onlyDigits(trimmedKey);
            if (!isValidCpf(digits)) throw new InvalidPixKeyError('CPF usado como chave Pix e invalido');
            return { key: digits, type: normalizedType };
        }
        case 'CNPJ': {
            const digits = onlyDigits(trimmedKey);
            if (!isValidCnpj(digits)) throw new InvalidPixKeyError('CNPJ usado como chave Pix e invalido');
            return { key: digits, type: normalizedType };
        }
        case 'EMAIL': {
            const email = trimmedKey.toLowerCase();
            if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                throw new InvalidPixKeyError('E-mail usado como chave Pix e invalido');
            }
            return { key: email, type: normalizedType };
        }
        case 'PHONE': {
            const compact = trimmedKey.replace(/[\s().-]/g, '');
            if (!/^\+[1-9]\d{7,14}$/.test(compact)) {
                throw new InvalidPixKeyError('Telefone Pix deve incluir o codigo do pais, por exemplo +5511999999999');
            }
            return { key: compact, type: normalizedType };
        }
        case 'EVP': {
            const evp = trimmedKey.toLowerCase();
            if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(evp)) {
                throw new InvalidPixKeyError('Chave Pix aleatoria invalida');
            }
            return { key: evp, type: normalizedType };
        }
    }
}

export function normalizePixKeyType(type: string | null | undefined): PixKeyType | null {
    const normalized = type?.trim().toUpperCase();
    if (normalized === 'CPF' || normalized === 'CNPJ' || normalized === 'EMAIL' || normalized === 'PHONE' || normalized === 'EVP') {
        return normalized;
    }
    return null;
}

function onlyDigits(value: string): string {
    return value.replace(/\D/g, '');
}

function isValidCpf(value: string): boolean {
    if (!/^\d{11}$/.test(value) || /^(\d)\1{10}$/.test(value)) return false;
    const calculateDigit = (length: number): number => {
        let sum = 0;
        for (let index = 0; index < length; index += 1) sum += Number(value[index]) * (length + 1 - index);
        const remainder = (sum * 10) % 11;
        return remainder === 10 ? 0 : remainder;
    };
    return calculateDigit(9) === Number(value[9]) && calculateDigit(10) === Number(value[10]);
}

function isValidCnpj(value: string): boolean {
    if (!/^\d{14}$/.test(value) || /^(\d)\1{13}$/.test(value)) return false;
    const calculateDigit = (base: string, weights: number[]): number => {
        const sum = base.split('').reduce((total, digit, index) => total + Number(digit) * weights[index], 0);
        const remainder = sum % 11;
        return remainder < 2 ? 0 : 11 - remainder;
    };
    const first = calculateDigit(value.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const second = calculateDigit(`${value.slice(0, 12)}${first}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return first === Number(value[12]) && second === Number(value[13]);
}
