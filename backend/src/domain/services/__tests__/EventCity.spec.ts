import { isEventInCity } from '../EventCity';

describe('EventCity', () => {
    it('matches GPS and geocoding address formats without case or accent sensitivity', () => {
        expect(isEventInCity('Rua das Flores, 10 - Centro, Curitiba', 'Curitiba')).toBe(true);
        expect(isEventInCity('Centro, Balneário Camboriú, Santa Catarina, Brasil', 'Balneario Camboriu')).toBe(true);
        expect(isEventInCity('Rua A, Centro, Curitiba - PR', 'Curitiba')).toBe(true);
    });

    it('does not include a neighboring city whose name only contains the selected city', () => {
        expect(isEventInCity('Centro, Balneário Camboriú, Santa Catarina, Brasil', 'Camboriú')).toBe(false);
        expect(isEventInCity('Centro, Camboriú, Santa Catarina, Brasil', 'Balneário Camboriú')).toBe(false);
    });

    it('does not include an address without an identifiable municipality', () => {
        expect(isEventInCity('Rua sem cidade, 100', 'Curitiba')).toBe(false);
    });
});
