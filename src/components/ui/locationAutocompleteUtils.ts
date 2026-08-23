import type { GeocodingResult } from '@/services/api/LocationService';

export function hasUsableGeocodingResult(result: GeocodingResult): boolean {
    const hasValidCoordinates = Number.isFinite(result.lat)
        && result.lat >= -90
        && result.lat <= 90
        && Number.isFinite(result.lon)
        && result.lon >= -180
        && result.lon <= 180;

    return Boolean((result.displayName || result.name).trim() && hasValidCoordinates);
}

export function isCompleteGeocodingResult(result: GeocodingResult): boolean {
    return Boolean(
        hasUsableGeocodingResult(result)
        && result.city.trim()
        && (result.stateCode || result.state).trim()
    );
}
