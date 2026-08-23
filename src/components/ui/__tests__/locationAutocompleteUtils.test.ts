import type { GeocodingResult } from '@/services/api/LocationService';
import { hasUsableGeocodingResult, isCompleteGeocodingResult } from '../locationAutocompleteUtils';

const completeAddress: GeocodingResult = {
    id: 'address-1',
    displayName: 'Rua das Flores, 100, Centro, Curitiba - PR',
    name: 'Rua das Flores, 100',
    lat: -25.4284,
    lon: -49.2733,
    city: 'Curitiba',
    state: 'Paraná',
    stateCode: 'PR',
    neighborhood: 'Centro',
    postalCode: '80000-000',
};

describe('isCompleteGeocodingResult', () => {
    it('accepts an address with municipality, state and valid coordinates', () => {
        expect(isCompleteGeocodingResult(completeAddress)).toBe(true);
    });

    it.each([
        ['city', { city: '' }],
        ['state', { state: '', stateCode: '' }],
        ['coordinates', { lat: Number.NaN }],
        ['coordinate range', { lon: 200 }],
    ])('rejects a result without a valid %s', (_field, updates) => {
        expect(isCompleteGeocodingResult({ ...completeAddress, ...updates })).toBe(false);
    });

    it('allows a geocoded place to be selected before city and state are completed manually', () => {
        expect(hasUsableGeocodingResult({
            ...completeAddress,
            city: '',
            state: '',
            stateCode: '',
        })).toBe(true);
    });

    it('does not allow a result without coordinates to be selected', () => {
        expect(hasUsableGeocodingResult({ ...completeAddress, lat: Number.NaN })).toBe(false);
    });
});
