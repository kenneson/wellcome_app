/**
 * Wellcome App — Design Tokens
 * 
 * Referência completa: /DESIGN.md
 * Inspiração visual: iFood (laranja predominante, fundo claro, cards elevados).
 */

const tintColorLight = '#FF8C42';
const tintColorDark = '#fff';

export const Colors = {
    light: {
        text: '#333333',
        background: '#FAFAFA',
        tint: tintColorLight,
        icon: '#687076',
        tabIconDefault: '#CDCDE0',
        tabIconSelected: tintColorLight,
        primary: '#FF8C42',
        primaryDark: '#E07830',
        secondary: '#FFF3E0',
        border: '#F0F0F0',
        borderStrong: '#E0E0E0',
        textSecondary: '#666666',
        textTertiary: '#999999',
        card: '#FFFFFF',
        error: '#FF3B30',
        success: '#4CAF50',
        warning: '#F59E0B',
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
        primaryDark: '#E07830',
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

/**
 * Shadow presets — use these instead of inline shadow definitions
 */
export const Shadows = {
    /** Cards, grupos de menu */
    light: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    /** Cards de evento, modais */
    medium: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    /** Botão CTA primário (laranja) */
    cta: {
        shadowColor: '#FF8C42',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    /** Botão CTA host (emerald) */
    ctaHost: {
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
};
