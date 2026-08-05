import { API_URL } from '@/shared/config/api';
import { supabase } from '@/shared/lib/supabase';
import * as Crypto from 'expo-crypto';

// Types
export interface Municipality {
    id: number;
    name: string;
    state: string;
    stateAbbr: string;
    fullName: string; // "Cidade - UF"
}

export interface GeocodingResult {
    id: string;
    displayName: string;
    name: string;
    lat: number;
    lon: number;
    city: string;
    state: string;
    stateCode: string;
    neighborhood: string;
    postalCode: string;
}

export interface GeocodingSuggestion {
    id: string;
    name: string;
    description: string;
}

// Cache for municipalities (loaded once)
let municipalitiesCache: Municipality[] = [];
let cacheLoaded = false;

class LocationService {
    private ibgeBaseUrl = 'https://servicodados.ibge.gov.br/api/v1/localidades';
    private apiUrl = API_URL;

    private async authHeaders(): Promise<Record<string, string>> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Sessão expirada');
        return { Authorization: `Bearer ${session.access_token}` };
    }

    /**
     * Load all Brazilian municipalities from IBGE API (cached)
     */
    async loadMunicipalities(): Promise<Municipality[]> {
        if (cacheLoaded) {
            return municipalitiesCache;
        }

        try {
            const response = await fetch(
                `${this.ibgeBaseUrl}/municipios?orderBy=nome`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch municipalities');
            }

            const data = await response.json();

            municipalitiesCache = data.map((item: any) => ({
                id: item.id,
                name: item.nome,
                state: item.microrregiao?.mesorregiao?.UF?.nome || '',
                stateAbbr: item.microrregiao?.mesorregiao?.UF?.sigla || '',
                fullName: `${item.nome} - ${item.microrregiao?.mesorregiao?.UF?.sigla || ''}`
            }));

            cacheLoaded = true;
            return municipalitiesCache;
        } catch (error) {
            console.error('Error loading municipalities:', error);
            return [];
        }
    }

    /**
     * Search municipalities by name (local filter on cached data)
     */
    async searchMunicipalities(query: string, limit = 10): Promise<Municipality[]> {
        const municipalities = await this.loadMunicipalities();

        if (!query.trim()) {
            return [];
        }

        const normalizedQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        return municipalities
            .filter(m => {
                const normalizedName = m.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const normalizedFull = m.fullName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                return normalizedName.includes(normalizedQuery) || normalizedFull.includes(normalizedQuery);
            })
            .slice(0, limit);
    }

    /**
     * Search addresses through the authenticated geocoding proxy.
     */
    async searchAddresses(query: string, sessionToken: string, proximity?: { latitude: number; longitude: number }): Promise<GeocodingSuggestion[]> {
        if (!query.trim() || query.length < 3) {
            return [];
        }
        const params = new URLSearchParams({ q: query, sessionToken });
        if (proximity) params.set('proximity', `${proximity.longitude},${proximity.latitude}`);
        const response = await fetch(`${this.apiUrl}/locations/suggest?${params.toString()}`, { headers: await this.authHeaders() });
        if (!response.ok) throw new Error('Não foi possível buscar endereços');
        return response.json();
    }

    async retrieveAddress(id: string, sessionToken: string): Promise<GeocodingResult> {
        const params = new URLSearchParams({ sessionToken });
        const response = await fetch(`${this.apiUrl}/locations/retrieve/${encodeURIComponent(id)}?${params.toString()}`, { headers: await this.authHeaders() });
        if (!response.ok) throw new Error('Não foi possível confirmar o endereço');
        const result = await response.json();
        return this.mapResolvedAddress(result);
    }

    async reverseGeocode(latitude: number, longitude: number): Promise<GeocodingResult> {
        const params = new URLSearchParams({ lat: String(latitude), lon: String(longitude) });
        const response = await fetch(`${this.apiUrl}/locations/reverse?${params.toString()}`, { headers: await this.authHeaders() });
        if (!response.ok) throw new Error('Não foi possível identificar sua localização');
        return this.mapResolvedAddress(await response.json());
    }

    /**
     * Get coordinates for a municipality (center point)
     */
    async getMunicipalityCoordinates(municipality: Municipality): Promise<{ lat: number; lon: number } | null> {
        try {
            const sessionToken = Crypto.randomUUID();
            const suggestions = await this.searchAddresses(`${municipality.name}, ${municipality.stateAbbr}`, sessionToken);
            if (!suggestions[0]) return null;
            const resolved = await this.retrieveAddress(suggestions[0].id, sessionToken);
            return { lat: resolved.lat, lon: resolved.lon };
        } catch {
            return null;
        }
    }

    private mapResolvedAddress(result: any): GeocodingResult {
        return {
            id: result.id,
            name: result.fullAddress,
            displayName: result.fullAddress,
            lat: Number(result.latitude),
            lon: Number(result.longitude),
            city: result.city ?? '',
            state: result.stateCode || result.state || '',
            stateCode: result.stateCode ?? '',
            neighborhood: result.neighborhood ?? '',
            postalCode: result.postalCode ?? '',
        };
    }
}

export const locationService = new LocationService();
