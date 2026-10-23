import { z } from 'zod';

export const MIN_PASSWORD_LENGTH = 8;

const requiredText = (message: string) => z.string().trim().min(1, message);

export const emailField = requiredText('Informe seu e-mail.').pipe(
    z.email('Digite um e-mail válido, como nome@exemplo.com.'),
);

export const loginSchema = z.object({
    email: emailField,
    password: z.string().min(1, 'Informe sua senha.'),
});

export const registerSchema = z
    .object({
        name: requiredText('Informe seu nome.').min(3, 'Digite seu nome completo.'),
        email: emailField,
        phoneNumber: z
            .string()
            .trim()
            .refine((value) => {
                if (!value) return true;
                const digits = value.replace(/\D/g, '');
                return digits.length >= 10 && digits.length <= 13;
            }, 'Digite um telefone com DDD, como (11) 99999-9999.'),
        password: z
            .string()
            .min(1, 'Crie uma senha.')
            .min(MIN_PASSWORD_LENGTH, `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`),
        confirmPassword: z.string().min(1, 'Repita sua senha.'),
        acceptedTerms: z.boolean().refine(Boolean, 'Leia e aceite os Termos de Uso e a Política de Privacidade.'),
    })
    .refine((data) => !data.confirmPassword || data.password === data.confirmPassword, {
        path: ['confirmPassword'],
        message: 'As senhas não coincidem.',
    });

export type FieldErrors<T> = Partial<Record<keyof T & string, string>>;

/**
 * Validates `values` and returns either the parsed data or the first
 * pt-BR message for each invalid field, ready to show under its input.
 */
export function validateForm<S extends z.ZodType>(
    schema: S,
    values: unknown,
): { success: true; data: z.output<S> } | { success: false; errors: FieldErrors<z.input<S>> } {
    const result = schema.safeParse(values);
    if (result.success) return { success: true, data: result.data };

    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
        const field = String(issue.path[0] ?? '');
        if (field && !errors[field]) errors[field] = issue.message;
    }
    return { success: false, errors: errors as FieldErrors<z.input<S>> };
}

/** First message of a failed validation, for screens that report errors in an alert. */
export function firstError(errors: Record<string, string | undefined>): string {
    return Object.values(errors).find(Boolean) ?? 'Confira os dados informados.';
}

const digitsOf = (value: string) => value.replace(/\D/g, '');

export function isValidCpf(value: string): boolean {
    const cpf = digitsOf(value);
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
    const check = (length: number) => {
        let sum = 0;
        for (let i = 0; i < length; i++) sum += Number(cpf[i]) * (length + 1 - i);
        const rest = (sum * 10) % 11;
        return rest === 10 ? 0 : rest;
    };
    return check(9) === Number(cpf[9]) && check(10) === Number(cpf[10]);
}

export function isValidCnpj(value: string): boolean {
    const cnpj = digitsOf(value);
    if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
    const check = (length: number) => {
        const weights = length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        const sum = weights.reduce((total, weight, i) => total + Number(cnpj[i]) * weight, 0);
        const rest = sum % 11;
        return rest < 2 ? 0 : 11 - rest;
    };
    return check(12) === Number(cnpj[12]) && check(13) === Number(cnpj[13]);
}

export function passesLuhn(value: string): boolean {
    const digits = digitsOf(value);
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
        let digit = Number(digits[digits.length - 1 - i]);
        if (i % 2 === 1) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
    }
    return digits.length > 0 && sum % 10 === 0;
}

const phoneField = requiredText('Informe seu telefone.').refine((value) => {
    const digits = digitsOf(value);
    return digits.length === 10 || digits.length === 11;
}, 'Digite um telefone com DDD, como (11) 99999-9999.');

const fullNameField = requiredText('Informe seu nome.').min(3, 'Digite seu nome completo.').max(120, 'O nome pode ter no máximo 120 caracteres.');

export const billingProfileSchema = (requireAddress: boolean) =>
    z.object({
        fullName: fullNameField,
        cpf: requiredText('Informe seu CPF.').refine(isValidCpf, 'Digite um CPF válido.'),
        email: emailField,
        mobilePhone: phoneField,
        postalCode: z.string().refine(
            (value) => (requireAddress ? digitsOf(value).length === 8 : !value || digitsOf(value).length === 8),
            requireAddress ? 'Informe o CEP para cadastrar um cartão.' : 'Digite um CEP com 8 números.',
        ),
        addressNumber: z.string().trim().refine(
            (value) => !requireAddress || value.length > 0,
            'Informe o número do endereço para cadastrar um cartão.',
        ),
    });

export const cardSchema = (now = new Date()) =>
    z
        .object({
            holderName: requiredText('Informe o nome impresso no cartão.').min(3, 'Digite o nome como está no cartão.'),
            number: requiredText('Informe o número do cartão.').refine(
                (value) => digitsOf(value).length >= 13 && digitsOf(value).length <= 19 && passesLuhn(value),
                'Confira o número do cartão.',
            ),
            expiryMonth: requiredText('Informe o mês de validade.').refine((value) => {
                const month = Number(value);
                return Number.isInteger(month) && month >= 1 && month <= 12;
            }, 'Digite um mês de validade entre 01 e 12.'),
            expiryYear: requiredText('Informe o ano de validade.').refine(
                (value) => /^\d{2}(\d{2})?$/.test(value),
                'Digite o ano de validade com 2 ou 4 números.',
            ),
            ccv: requiredText('Informe o código de segurança (CVV).').refine(
                (value) => /^\d{3,4}$/.test(value),
                'O código de segurança tem 3 ou 4 números.',
            ),
        })
        .refine((data) => {
            const month = Number(data.expiryMonth);
            const year = Number(data.expiryYear) + (data.expiryYear.length === 2 ? 2000 : 0);
            if (!month || !year) return true;
            return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
        }, { path: ['expiryYear'], message: 'Este cartão está vencido.' });

export type PixKeyType = 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validatePixKey(type: string, rawKey: string): string | null {
    const key = rawKey.trim();
    if (!key) return 'Informe a chave PIX.';
    switch (type) {
        case 'CPF':
            return isValidCpf(key) ? null : 'Digite um CPF válido.';
        case 'CNPJ':
            return isValidCnpj(key) ? null : 'Digite um CNPJ válido.';
        case 'EMAIL':
            return z.email().safeParse(key).success ? null : 'Digite um e-mail válido.';
        case 'PHONE': {
            const digits = digitsOf(key).replace(/^55(?=\d{10,11}$)/, '');
            return digits.length === 10 || digits.length === 11 ? null : 'Digite um telefone com DDD.';
        }
        case 'EVP':
            return UUID.test(key) ? null : 'A chave aleatória tem o formato 123e4567-e89b-12d3-a456-426614174000.';
        default:
            return null;
    }
}

export const usernameField = requiredText('Escolha um nome de usuário.')
    .min(3, 'O nome de usuário precisa ter pelo menos 3 caracteres.')
    .max(30, 'O nome de usuário pode ter no máximo 30 caracteres.')
    .regex(/^[a-z0-9_]+$/, 'Use só letras minúsculas, números e sublinhado no nome de usuário.');

const optionalPhoneField = z.string().trim().refine((value) => {
    if (!value) return true;
    const digits = digitsOf(value);
    return digits.length >= 10 && digits.length <= 13;
}, 'Digite um telefone com DDD, como (11) 99999-9999.');

export const profileSchema = z.object({
    fullName: fullNameField,
    occupation: requiredText('Informe sua ocupação.'),
    lookingFor: requiredText('Escolha o que você procura no Wellcome.'),
    city: requiredText('Informe sua cidade.'),
    neighborhood: requiredText('Informe seu bairro.'),
    phoneNumber: optionalPhoneField,
});

export const onboardingSteps = {
    identity: z.object({ full_name: fullNameField, username: usernameField }),
    occupation: z.object({ occupation: requiredText('Informe sua ocupação.') }),
    location: z.object({ city: requiredText('Informe sua cidade.'), neighborhood: requiredText('Informe seu bairro.') }),
};
