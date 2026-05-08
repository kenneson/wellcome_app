import { API_URL } from '@/shared/config/api';

// Types
export interface Municipality {
    id: number;
    name: string;
    state: string;
    stateAbbr: string;
    fullName: string; // "Cidade - UF"
}

export interface GeocodingResult {
    displayName: string;
    lat: number;
    lon: number;
}

// Cache for municipalities (loaded once)
let municipalitiesCache: Municipality[] = [];
let cacheLoaded = false;

class LocationService {
    private ibgeBaseUrl = 'https://servicodados.ibge.gov.br/api/v1/localidades';
    private nominatimBaseUrl = 'https://nominatim.openstreetmap.org';

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
            if (__DEV__) console.error('Error loading municipalities:', error);
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
     * Geocode an address to get coordinates using Nominatim
     */
    async geocodeAddress(address: string, countryCode = 'br'): Promise<GeocodingResult[]> {
        try {
            const encoded = encodeURIComponent(address);
            const response = await fetch(
                `${this.nominatimBaseUrl}/search?q=${encoded}&countrycodes=${countryCode}&format=json&limit=5`,
                {
                    headers: {
                        'User-Agent': 'WellcomeApp/1.0'
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Geocoding failed');
            }

            const data = await response.json();

            return data.map((item: any) => ({
                displayName: item.display_name,
                lat: parseFloat(item.lat),
                lon: parseFloat(item.lon)
            }));
        } catch (error) {
            if (__DEV__) console.error('Geocoding error:', error);
            return [];
        }
    }

    /**
     * Search for addresses with autocomplete (using Nominatim)
     */
    async searchAddresses(query: string, limit = 5): Promise<GeocodingResult[]> {
        if (!query.trim() || query.length < 3) {
            return [];
        }

        return this.geocodeAddress(query);
    }

    /**
     * Get coordinates for a municipality (center point)
     */
    async getMunicipalityCoordinates(municipality: Municipality): Promise<{ lat: number; lon: number } | null> {
        const results = await this.geocodeAddress(`${municipality.name}, ${municipality.stateAbbr}, Brasil`);

        if (results.length > 0) {
            return {
                lat: results[0].lat,
                lon: results[0].lon
            };
        }

        return null;
    }
}

export const locationService = new LocationService();
