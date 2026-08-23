import { GeoapifyLocationService } from '../GeoapifyLocationService';

describe('GeoapifyLocationService', () => {
    const originalApiKey = process.env.GEOAPIFY_API_KEY;
    const fetchMock = jest.fn();

    beforeEach(() => {
        process.env.GEOAPIFY_API_KEY = 'test-api-key';
        fetchMock.mockReset();
        global.fetch = fetchMock as typeof fetch;
    });

    afterAll(() => {
        if (originalApiKey === undefined) delete process.env.GEOAPIFY_API_KEY;
        else process.env.GEOAPIFY_API_KEY = originalApiKey;
    });

    it('suggests only Brazilian addresses and applies proximity bias', async () => {
        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ({
                results: [{
                    place_id: 'place-1',
                    address_line1: 'Rua XV de Novembro, 100',
                    formatted: 'Rua XV de Novembro, 100, Curitiba, PR, Brasil',
                }],
            }),
        });

        const result = await new GeoapifyLocationService().suggest(
            'Rua XV de Novembro',
            '2faf39b7-d41a-4bd0-89df-8907530299f5',
            '-49.2733,-25.4284',
        );

        expect(result).toEqual([{
            id: 'place-1',
            name: 'Rua XV de Novembro, 100',
            description: 'Rua XV de Novembro, 100, Curitiba, PR, Brasil',
        }]);
        const requestUrl = new URL(fetchMock.mock.calls[0][0]);
        expect(requestUrl.pathname).toBe('/v1/geocode/autocomplete');
        expect(requestUrl.searchParams.get('filter')).toBe('countrycode:br');
        expect(requestUrl.searchParams.get('bias')).toBe('proximity:-49.2733,-25.4284');
        expect(requestUrl.searchParams.get('apiKey')).toBe('test-api-key');
    });

    it('retrieves normalized address details by place id', async () => {
        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ({
                features: [{
                    properties: {
                        feature_type: 'details',
                        place_id: 'place-1',
                        formatted: 'Rua XV de Novembro, 100, Curitiba, PR, Brasil',
                        lat: -25.4284,
                        lon: -49.2733,
                        city: 'Curitiba',
                        state: 'Paraná',
                        state_code: 'BR-PR',
                        suburb: 'Centro',
                        postcode: '80020-310',
                    },
                }],
            }),
        });

        const result = await new GeoapifyLocationService().retrieve(
            'place-1',
            '2faf39b7-d41a-4bd0-89df-8907530299f5',
        );

        expect(result).toEqual({
            id: 'place-1',
            fullAddress: 'Rua XV de Novembro, 100, Curitiba, PR, Brasil',
            latitude: -25.4284,
            longitude: -49.2733,
            city: 'Curitiba',
            state: 'Paraná',
            stateCode: 'PR',
            neighborhood: 'Centro',
            postalCode: '80020-310',
        });
    });

    it('completes missing city and state with reverse geocoding', async () => {
        fetchMock
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    features: [{
                        properties: {
                            feature_type: 'details',
                            place_id: 'place-without-city',
                            formatted: 'Rua das Palmeiras, 120, Brasil',
                            lat: -26.9926,
                            lon: -48.6352,
                        },
                    }],
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    results: [{
                        place_id: 'reverse-place',
                        formatted: 'Rua das Palmeiras, 120, Centro, Balneário Camboriú, SC, Brasil',
                        lat: -26.9926,
                        lon: -48.6352,
                        municipality: 'Balneário Camboriú',
                        state: 'Santa Catarina',
                        state_code: 'BR-SC',
                        city_district: 'Centro',
                        postcode: '88330-000',
                    }],
                }),
            });

        const result = await new GeoapifyLocationService().retrieve(
            'place-without-city',
            '2faf39b7-d41a-4bd0-89df-8907530299f5',
        );

        expect(result).toEqual(expect.objectContaining({
            id: 'place-without-city',
            fullAddress: 'Rua das Palmeiras, 120, Brasil',
            city: 'Balneário Camboriú',
            state: 'Santa Catarina',
            stateCode: 'SC',
            neighborhood: 'Centro',
            postalCode: '88330-000',
        }));
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(new URL(fetchMock.mock.calls[1][0]).pathname).toBe('/v1/geocode/reverse');
    });

    it('uses Brazilian locality alternatives returned by Geoapify', async () => {
        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ({
                features: [{
                    properties: {
                        feature_type: 'details',
                        place_id: 'place-village',
                        street: 'Estrada Geral',
                        housenumber: '45',
                        lat: -27.0,
                        lon: -49.0,
                        village: 'Localidade Rural',
                        state: 'Santa Catarina',
                        state_code: 'BR-SC',
                    },
                }],
            }),
        });

        const result = await new GeoapifyLocationService().retrieve(
            'place-village',
            '2faf39b7-d41a-4bd0-89df-8907530299f5',
        );

        expect(result.fullAddress).toBe('Estrada Geral, 45');
        expect(result.city).toBe('Localidade Rural');
        expect(result.stateCode).toBe('SC');
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('reverse geocodes coordinates', async () => {
        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ({
                results: [{
                    place_id: 'place-2',
                    formatted: 'Balneário Camboriú, SC, Brasil',
                    lat: '-26.9926',
                    lon: '-48.6352',
                    city: 'Balneário Camboriú',
                    state: 'Santa Catarina',
                    state_code: 'SC',
                }],
            }),
        });

        const result = await new GeoapifyLocationService().reverse(-26.9926, -48.6352);

        expect(result.city).toBe('Balneário Camboriú');
        expect(result.stateCode).toBe('SC');
        expect(result.latitude).toBe(-26.9926);
        expect(result.longitude).toBe(-48.6352);
    });

    it('fails clearly when the API key is not configured', async () => {
        delete process.env.GEOAPIFY_API_KEY;

        await expect(new GeoapifyLocationService().suggest(
            'Curitiba',
            '2faf39b7-d41a-4bd0-89df-8907530299f5',
        )).rejects.toThrow('GEOAPIFY_NOT_CONFIGURED');
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
