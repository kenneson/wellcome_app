import { InvalidPixKeyError, normalizePixKey } from '../PixKeyValidation';

describe('PixKeyValidation', () => {
    it('normalizes CPF, CNPJ, email, phone and EVP keys', () => {
        expect(normalizePixKey('529.982.247-25', 'cpf')).toEqual({
            key: '52998224725',
            type: 'CPF',
        });
        expect(normalizePixKey('11.222.333/0001-81', 'CNPJ')).toEqual({
            key: '11222333000181',
            type: 'CNPJ',
        });
        expect(normalizePixKey(' Host@Example.COM ', 'EMAIL')).toEqual({
            key: 'host@example.com',
            type: 'EMAIL',
        });
        expect(normalizePixKey('+55 (11) 99999-9999', 'PHONE')).toEqual({
            key: '+5511999999999',
            type: 'PHONE',
        });
        expect(normalizePixKey('550e8400-e29b-41d4-a716-446655440000', 'EVP')).toEqual({
            key: '550e8400-e29b-41d4-a716-446655440000',
            type: 'EVP',
        });
    });

    it('rejects invalid keys instead of sending them to the provider', () => {
        expect(() => normalizePixKey('111.111.111-11', 'CPF')).toThrow(InvalidPixKeyError);
        expect(() => normalizePixKey('11999999999', 'PHONE')).toThrow('codigo do pais');
        expect(() => normalizePixKey('not-a-uuid', 'EVP')).toThrow(InvalidPixKeyError);
    });
});
