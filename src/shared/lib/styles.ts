import { Platform, ViewStyle } from 'react-native';

/**
 * Default placeholder image for when no image is available.
 * Using a data URI to avoid external dependencies.
 */
export const DEFAULT_PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjRjBGMEYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';

export const DEFAULT_AVATAR_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjRTBFMEUwIi8+PGNpcmNsZSBjeD0iNzUiIGN5PSI2MCIgcj0iMzAiIGZpbGw9IiNGRjhDNDIiLz48ZWxsaXBzZSBjeD0iNzUiIGN5PSIxMzAiIHJ4PSI0NSIgcnk9IjMwIiBmaWxsPSIjRkY4QzQyIi8+PC9zdmc+';

/**
 * Cross-platform shadow styles.
 * Uses boxShadow for web and shadow* props for native.
 */
interface ShadowOptions {
    color?: string;
    offsetX?: number;
    offsetY?: number;
    opacity?: number;
    radius?: number;
    elevation?: number;
}

export function createShadow({
    color = '#000',
    offsetX = 0,
    offsetY = 2,
    opacity = 0.1,
    radius = 8,
    elevation = 4,
}: ShadowOptions = {}): ViewStyle {
    if (Platform.OS === 'web') {
        // Convert opacity to rgba
        const hexToRgba = (hex: string, alpha: number) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };

        return {
            // @ts-ignore - boxShadow is valid for web
            boxShadow: `${offsetX}px ${offsetY}px ${radius}px ${hexToRgba(color, opacity)}`,
        };
    }

    // Native platforms
    return {
        shadowColor: color,
        shadowOffset: { width: offsetX, height: offsetY },
        shadowOpacity: opacity,
        shadowRadius: radius,
        elevation,
    };
}

// Pre-defined shadow presets
export const shadows = {
    sm: createShadow({ offsetY: 1, radius: 2, opacity: 0.1, elevation: 2 }),
    md: createShadow({ offsetY: 2, radius: 8, opacity: 0.1, elevation: 4 }),
    lg: createShadow({ offsetY: 4, radius: 12, opacity: 0.15, elevation: 6 }),
    xl: createShadow({ offsetY: 6, radius: 16, opacity: 0.2, elevation: 8 }),
    orange: createShadow({ color: '#FF8C42', offsetY: 4, radius: 8, opacity: 0.3, elevation: 4 }),
};
