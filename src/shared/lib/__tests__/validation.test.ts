import { friendlyErrorMessage } from '../errorMessages';
import { loginSchema, registerSchema, validateForm } from '../validation';

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
