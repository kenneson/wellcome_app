import { isValidCardExpiry, isValidCardNumber, isValidCpfCnpj } from '../PaymentValidation';

describe('PaymentValidation', () => {
    it('validates CPF and CNPJ check digits', () => {
        expect(isValidCpfCnpj('529.982.247-25')).toBe(true);
        expect(isValidCpfCnpj('04.252.011/0001-10')).toBe(true);
        expect(isValidCpfCnpj('111.111.111-11')).toBe(false);
        expect(isValidCpfCnpj('04.252.011/0001-11')).toBe(false);
    });

    it('validates card numbers with Luhn', () => {
        expect(isValidCardNumber('4111 1111 1111 1111')).toBe(true);
        expect(isValidCardNumber('4111 1111 1111 1112')).toBe(false);
    });

    it('rejects expired cards', () => {
        const now = new Date();
        expect(isValidCardExpiry(now.getMonth() + 1, now.getFullYear() - 1)).toBe(false);
        expect(isValidCardExpiry(12, now.getFullYear() + 2)).toBe(true);
    });
});
