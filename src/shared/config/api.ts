import Constants from 'expo-constants';

/**
 * The base URL for the backend API.
 * Uses EXPO_PUBLIC_API_URL if defined, otherwise falls back to a default based on the environment.
 * 
 * For iOS Simulator: Use http://localhost:3000
 * For Physical Device: Use your LAN IP (e.g., http://192.168.1.X:3000)
 */
const getBaseUrl = () => {
    const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

    if (configuredUrl) {
        return configuredUrl;
    }

    if (__DEV__) {
        const developmentHost = Constants.expoConfig?.hostUri?.split(':')[0];

        if (developmentHost) {
            return `http://${developmentHost}:3000`;
        }

        return 'http://localhost:3000';
    }

    if (__DEV__) console.warn('EXPO_PUBLIC_API_URL is missing for this production build.');
    return 'https://wellcome.invalid';
};

export const API_URL = getBaseUrl();
