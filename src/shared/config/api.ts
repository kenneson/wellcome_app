import Constants from 'expo-constants';

/**
 * The base URL for the backend API.
 * Uses EXPO_PUBLIC_API_URL if defined, otherwise falls back to a default based on the environment.
 * 
 * For iOS Simulator: Use http://localhost:3000
 * For Physical Device: Use your LAN IP (e.g., http://192.168.1.X:3000)
 */
const getBaseUrl = () => {
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }

    // Fallback for development if env var is missing
    // For physical devices, set EXPO_PUBLIC_API_URL in your .env file with your LAN IP
    return 'http://192.168.1.11:3000';
};

export const API_URL = getBaseUrl();
