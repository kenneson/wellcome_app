export interface AddressSuggestion {
    id: string;
    name: string;
    description: string;
}

export interface ResolvedAddress {
    id: string;
    fullAddress: string;
    latitude: number;
    longitude: number;
    city: string | null;
    state: string | null;
    stateCode: string | null;
    neighborhood: string | null;
    postalCode: string | null;
}

interface GeoapifyAddress {
    place_id?: string;
    name?: string;
    formatted?: string;
    address_line1?: string;
    address_line2?: string;
    lat?: number | string;
    lon?: number | string;
    city?: string;
    municipality?: string;
    town?: string;
    village?: string;
    locality?: string;
    county?: string;
    state?: string;
    state_code?: string;
    suburb?: string;
    city_district?: string;
    state_district?: string;
    district?: string;
    postcode?: string;
    street?: string;
    housenumber?: string;
    feature_type?: string;
}

export class GeoapifyLocationService {
    private readonly baseUrl = 'https://api.geoapify.com';

    async suggest(query: string, _sessionToken: string, proximity?: string): Promise<AddressSuggestion[]> {
        const data = await this.request('/v1/geocode/autocomplete', {
            text: query,
            format: 'json',
            filter: 'countrycode:br',
            lang: 'pt',
            limit: '6',
            ...(proximity ? { bias: `proximity:${proximity}` } : {}),
        });

        return (data.results ?? [])
            .filter((item: GeoapifyAddress) => item.place_id)
            .map((item: GeoapifyAddress) => ({
                id: item.place_id as string,
                name: item.address_line1 || item.name || item.formatted || 'Endereço',
                description: item.formatted || [item.address_line1, item.address_line2].filter(Boolean).join(', '),
            }));
    }

    async retrieve(id: string, _sessionToken: string): Promise<ResolvedAddress> {
        const data = await this.request('/v2/place-details', {
            id,
            features: 'details',
            lang: 'pt',
        });
        const feature = data.features?.find((item: any) => item.properties?.feature_type === 'details')
            ?? data.features?.[0];
        if (!feature) throw new Error('ADDRESS_NOT_FOUND');
        const resolved = this.mapAddress(feature.properties ?? {}, feature.geometry?.coordinates);

        if (resolved.city && (resolved.stateCode || resolved.state)) {
            return resolved;
        }

        try {
            const fallback = await this.reverse(resolved.latitude, resolved.longitude);
            return {
                ...resolved,
                fullAddress: resolved.fullAddress || fallback.fullAddress,
                city: resolved.city || fallback.city,
                state: resolved.state || fallback.state,
                stateCode: resolved.stateCode || fallback.stateCode,
                neighborhood: resolved.neighborhood || fallback.neighborhood,
                postalCode: resolved.postalCode || fallback.postalCode,
            };
        } catch {
            return resolved;
        }
    }

    async reverse(latitude: number, longitude: number): Promise<ResolvedAddress> {
        const data = await this.request('/v1/geocode/reverse', {
            lat: String(latitude),
            lon: String(longitude),
            format: 'json',
            lang: 'pt',
            limit: '1',
        });
        const address = data.results?.[0];
        if (!address) throw new Error('ADDRESS_NOT_FOUND');
        return this.mapAddress(address);
    }

    private async request(path: string, params: Record<string, string>): Promise<any> {
        const apiKey = process.env.GEOAPIFY_API_KEY;
        if (!apiKey) throw new Error('GEOAPIFY_NOT_CONFIGURED');

        const query = new URLSearchParams({ ...params, apiKey });
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8_000);

        try {
            const response = await fetch(`${this.baseUrl}${path}?${query.toString()}`, {
                signal: controller.signal,
            });
            if (!response.ok) throw new Error(`GEOAPIFY_${response.status}`);
            return response.json();
        } finally {
            clearTimeout(timeout);
        }
    }

    private mapAddress(address: GeoapifyAddress, geometryCoordinates?: unknown[]): ResolvedAddress {
        const longitude = Number(address.lon ?? geometryCoordinates?.[0]);
        const latitude = Number(address.lat ?? geometryCoordinates?.[1]);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            throw new Error('ADDRESS_WITHOUT_COORDINATES');
        }

        const streetAddress = [address.street, address.housenumber].filter(Boolean).join(', ');
        const fullAddress = address.formatted
            || [address.address_line1 || streetAddress, address.address_line2].filter(Boolean).join(', ');

        return {
            id: address.place_id ?? `${latitude},${longitude}`,
            fullAddress,
            latitude,
            longitude,
            city: address.city
                ?? address.municipality
                ?? address.town
                ?? address.village
                ?? address.locality
                ?? address.county
                ?? address.state_district
                ?? null,
            state: address.state ?? null,
            stateCode: address.state_code?.replace(/^BR-/i, '').toUpperCase() ?? null,
            neighborhood: address.suburb ?? address.city_district ?? address.district ?? null,
            postalCode: address.postcode ?? null,
        };
    }
}
