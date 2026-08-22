import type { GeocodingResult } from '@/services/api/LocationService';

export function isCompleteGeocodingResult(result: GeocodingResult): boolean {
    const hasValidCoordinates = Number.isFinite(result.lat)
        && result.lat >= -90
        && result.lat <= 90
        && Number.isFinite(result.lon)
        && result.lon >= -180
        && result.lon <= 180;

    return Boolean(
        result.displayName.trim()
        && result.city.trim()
        && (result.stateCode || result.state).trim()
        && hasValidCoordinates
    );
}
