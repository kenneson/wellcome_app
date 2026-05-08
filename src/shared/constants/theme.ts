/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#FF8C42';
const tintColorDark = '#fff';

export const Colors = {
    light: {
        text: '#11181C',
        background: '#fff',
        tint: tintColorLight,
        icon: '#687076',
        tabIconDefault: '#687076',
        tabIconSelected: tintColorLight,
        primary: '#FF8C42',
        secondary: '#FFF3E0',
        border: '#eee',
        borderStrong: '#E0E0E0',
        textSecondary: '#666',
        textTertiary: '#999',
        card: '#fff',
        error: '#FF3B30',
        success: '#4CAF50',
        warning: '#FFA500',
        overlay: 'rgba(0,0,0,0.5)',
    },
    /** Host-mode palette — visually distinct from participant (orange) */
    host: {
        primary: '#1E293B',       // Slate-800
        accent: '#10B981',        // Emerald-500
        accentLight: '#F0FDF4',   // Green-50
        background: '#F8FAFC',    // Slate-50
        card: '#FFFFFF',
        headerBg: '#0F172A',      // Slate-900
        headerText: '#FFFFFF',
        textPrimary: '#0F172A',
        textSecondary: '#64748B', // Slate-500
        border: '#E2E8F0',       // Slate-200
        pendingBadge: '#F59E0B',  // Amber-500
    },
    dark: {
        text: '#ECEDEE',
        background: '#151718',
        tint: tintColorDark,
        icon: '#9BA1A6',
        tabIconDefault: '#9BA1A6',
        tabIconSelected: tintColorDark,
        primary: '#FF8C42',
        secondary: '#2C2C2E',
        border: '#38383A',
        borderStrong: '#48484A',
        textSecondary: '#AEAEB2',
        textTertiary: '#8E8E93',
        card: '#1C1C1E',
        error: '#FF453A',
        success: '#32D74B',
        warning: '#FFD60A',
        overlay: 'rgba(0,0,0,0.7)',
    },
};

/**
 * Spacing scale for consistent spacing throughout the app
 */
export const Spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
};

/**
 * Component dimensions
 */
export const Dimensions = {
    logo: { width: 100, height: 30 },
    avatar: { size: 100 },
    avatarSmall: { size: 40 },
    icon: {
        small: 16,
        medium: 20,
        large: 24,
        xlarge: 28,
    },
    touchTarget: {
        min: 44, // WCAG minimum
        recommended: 48,
    },
    categoryCard: {
        width: 110,
        height: 110,
    },
    eventImage: {
        height: 180,
    },
    fab: {
        size: 56,
        borderRadius: 28,
    },
    tabBar: {
        height: 60,
    },
};

/**
 * Border radius scale
 */
export const BorderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    full: 9999,
};
