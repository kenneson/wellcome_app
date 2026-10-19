import { friendlyErrorMessage } from '../errorMessages';
import {
    billingProfileSchema,
    cardSchema,
    isValidCnpj,
    isValidCpf,
    loginSchema,
    onboardingSteps,
    registerSchema,
    validateForm,
    validatePixKey,
} from '../validation';

describe('login validation', () => {
    it('asks for both fields when nothing is filled in', () => {
        const result = validateForm(loginSchema, { email: '', password: '' });
        expect(result.success).toBe(false);
        if (result.success) return;
        expect(result.errors).toEqual({ email: 'Informe seu e-mail.', password: 'Informe sua senha.' });
    });

    it('rejects a malformed e-mail and trims a valid one', () => {
        const bad = validateForm(loginSchema, { email: 'joao@', password: 'x' });
        expect(bad.success).toBe(false);
        if (!bad.success) expect(bad.errors.email).toMatch(/e-mail válido/);

        const good = validateForm(loginSchema, { email: '  joao@exemplo.com ', password: 'segredo' });
        expect(good).toEqual({ success: true, data: { email: 'joao@exemplo.com', password: 'segredo' } });
    });
});

describe('register validation', () => {
    const valid = {
        name: 'Maria Silva',
        email: 'maria@exemplo.com',
        phoneNumber: '(11) 99999-9999',
        password: 'segredo1',
        confirmPassword: 'segredo1',
        acceptedTerms: true,
    };

    it('accepts a complete form and an empty optional phone', () => {
        expect(validateForm(registerSchema, valid).success).toBe(true);
        expect(validateForm(registerSchema, { ...valid, phoneNumber: '' }).success).toBe(true);
    });

    it('flags short passwords, mismatched confirmation and bad phones', () => {
        const result = validateForm(registerSchema, { ...valid, password: '123', confirmPassword: '124', phoneNumber: '123' });
        expect(result.success).toBe(false);
        if (result.success) return;
        expect(result.errors.password).toMatch(/pelo menos 6/);
        expect(result.errors.confirmPassword).toBe('As senhas não coincidem.');
        expect(result.errors.phoneNumber).toMatch(/DDD/);
    });
});

describe('friendlyErrorMessage', () => {
    it('never shows raw JSON', () => {
        const zodJson = '[{"origin":"string","code":"invalid_format","path":["email"],"message":"Invalid email address"}]';
        expect(friendlyErrorMessage(new Error(zodJson), 'Confira os dados.')).toBe('Confira os dados.');
        expect(friendlyErrorMessage(new SyntaxError('JSON Parse error: Unexpected character: <'))).toBe('Algo deu errado. Tente novamente.');
    });

    it('translates known auth errors and keeps pt-BR messages', () => {
        expect(friendlyErrorMessage(new Error('Invalid login credentials'))).toBe('E-mail ou senha incorretos.');
        expect(friendlyErrorMessage(new Error('Network request failed'))).toMatch(/conectar ao servidor/);
        expect(friendlyErrorMessage(new Error('Login failed'), 'fallback')).toBe('fallback');
        expect(friendlyErrorMessage(new Error('Evento lotado.'))).toBe('Evento lotado.');
    });
});

describe('payment and profile validation', () => {
    it('checks CPF and CNPJ check digits', () => {
        expect(isValidCpf('529.982.247-25')).toBe(true);
        expect(isValidCpf('529.982.247-24')).toBe(false);
        expect(isValidCpf('111.111.111-11')).toBe(false);
        expect(isValidCnpj('11.222.333/0001-81')).toBe(true);
        expect(isValidCnpj('11.222.333/0001-80')).toBe(false);
    });

    it('requires the address only when registering a card', () => {
        const profile = { fullName: 'Maria Silva', cpf: '529.982.247-25', email: 'maria@exemplo.com', mobilePhone: '(11) 99999-9999', postalCode: '', addressNumber: '' };
        expect(validateForm(billingProfileSchema(false), profile).success).toBe(true);
        const forCard = validateForm(billingProfileSchema(true), profile);
        expect(forCard.success).toBe(false);
        if (!forCard.success) expect(forCard.errors.postalCode).toMatch(/CEP/);
    });

    it('rejects invalid and expired cards', () => {
        const now = new Date(2026, 9, 19);
        const card = { holderName: 'MARIA SILVA', number: '4111 1111 1111 1111', expiryMonth: '12', expiryYear: '28', ccv: '123' };
        expect(validateForm(cardSchema(now), card).success).toBe(true);
        const badNumber = validateForm(cardSchema(now), { ...card, number: '4111 1111 1111 1112' });
        expect(!badNumber.success && badNumber.errors.number).toBe('Confira o número do cartão.');
        const expired = validateForm(cardSchema(now), { ...card, expiryMonth: '09', expiryYear: '2026' });
        expect(!expired.success && expired.errors.expiryYear).toBe('Este cartão está vencido.');
    });

    it('validates PIX keys by type', () => {
        expect(validatePixKey('CPF', '529.982.247-25')).toBeNull();
        expect(validatePixKey('EMAIL', 'maria@')).toBe('Digite um e-mail válido.');
        expect(validatePixKey('PHONE', '+55 (11) 99999-9999')).toBeNull();
        expect(validatePixKey('EVP', '123e4567-e89b-12d3-a456-426614174000')).toBeNull();
        expect(validatePixKey('CPF', ' ')).toBe('Informe a chave PIX.');
    });

    it('validates onboarding usernames', () => {
        const result = validateForm(onboardingSteps.identity, { full_name: 'Maria Silva', username: 'ma' });
        expect(!result.success && result.errors.username).toMatch(/pelo menos 3/);
    });
});
