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

export class MapboxLocationService {
    private readonly baseUrl = 'https://api.mapbox.com/search/searchbox/v1';

    async suggest(query: string, sessionToken: string, proximity?: string): Promise<AddressSuggestion[]> {
        const data = await this.request('/suggest', {
            q: query,
            session_token: sessionToken,
            country: 'BR',
            language: 'pt',
            limit: '6',
            ...(proximity ? { proximity } : {}),
        });
        return (data.suggestions ?? []).map((item: any) => ({
            id: item.mapbox_id,
            name: item.name,
            description: item.full_address || item.place_formatted || item.name,
        }));
    }

    async retrieve(id: string, sessionToken: string): Promise<ResolvedAddress> {
        const data = await this.request(`/retrieve/${encodeURIComponent(id)}`, {
            session_token: sessionToken,
        });
        const feature = data.features?.[0];
        if (!feature) throw new Error('ADDRESS_NOT_FOUND');
        return this.mapFeature(feature);
    }

    async reverse(latitude: number, longitude: number): Promise<ResolvedAddress> {
        const data = await this.request('/reverse', {
            latitude: String(latitude),
            longitude: String(longitude),
            country: 'BR',
            language: 'pt',
            limit: '1',
        });
        const feature = data.features?.[0];
        if (!feature) throw new Error('ADDRESS_NOT_FOUND');
        return this.mapFeature(feature);
    }

    private async request(path: string, params: Record<string, string>): Promise<any> {
        const token = process.env.MAPBOX_ACCESS_TOKEN;
        if (!token) throw new Error('MAPBOX_NOT_CONFIGURED');
        const query = new URLSearchParams({ ...params, access_token: token });
        const response = await fetch(`${this.baseUrl}${path}?${query.toString()}`);
        if (!response.ok) throw new Error(`MAPBOX_${response.status}`);
        return response.json();
    }

    private mapFeature(feature: any): ResolvedAddress {
        const properties = feature.properties ?? {};
        const context = properties.context ?? {};
        const coordinates = properties.coordinates ?? {};
        const longitude = Number(coordinates.longitude ?? feature.geometry?.coordinates?.[0]);
        const latitude = Number(coordinates.latitude ?? feature.geometry?.coordinates?.[1]);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error('ADDRESS_WITHOUT_COORDINATES');

        return {
            id: properties.mapbox_id ?? feature.id,
            fullAddress: properties.full_address || [properties.name, properties.place_formatted].filter(Boolean).join(', '),
            latitude,
            longitude,
            city: context.place?.name ?? context.locality?.name ?? null,
            state: context.region?.name ?? null,
            stateCode: context.region?.region_code?.replace(/^BR-/, '') ?? null,
            neighborhood: context.neighborhood?.name ?? null,
            postalCode: context.postcode?.name ?? null,
        };
    }
}
