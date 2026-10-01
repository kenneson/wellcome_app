/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#FF8C42';
const tintColorDark = '#fff';

export const Colors = {
    light: {
        text: '#281914',
        background: '#fff',
        canvas: '#FFF8F3',
        tint: tintColorLight,
        icon: '#7A655B',
        tabIconDefault: '#7A655B',
        tabIconSelected: tintColorLight,
        primary: '#FF8C42',
        primaryDeep: '#C94E16',
        secondary: '#FFEFE3',
        border: '#EFE3DA',
        borderStrong: '#E3D3C7',
        textSecondary: '#5E4A41',
        textTertiary: '#7A655B',
        card: '#fff',
        error: '#FF3B30',
        success: '#1F6D5D',
        warning: '#FFA500',
        overlay: 'rgba(0,0,0,0.5)',
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
        canvas: '#151718',
        primaryDeep: '#FF8C42',
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
    sheet: 28,
    full: 9999,
};

/**
 * Wellcome brand tokens. Orange is reserved for actions and highlights;
 * ink and paper carry the content so the brand color keeps its weight.
 */
export const Palette = {
    orange: '#FF8C42',
    orangeDeep: '#C94E16',
    orangeDarker: '#9A3A0E',
    orangeSoft: '#FFEFE3',
    orangeOnBrand: '#FFF3EA',
    ink: '#281914',
    inkSoft: '#5E4A41',
    muted: '#7A655B',
    subtle: '#B9A69B',
    paper: '#FFF8F3',
    surface: '#FFFFFF',
    track: '#F3E7DE',
    line: '#EFE3DA',
    lineSoft: '#F5ECE5',
    blue: '#315E9E',
    blueSoft: '#EAF0F9',
    green: '#1F6D5D',
    greenSoft: '#E6F2EF',
    danger: '#B42318',
    dangerLine: '#F3D0CC',
    star: '#FFB547',
    scrim: 'rgba(40,25,20,0.72)',
    onBrandGlass: 'rgba(255,255,255,0.22)',
};

/** Single warm shadow used by floating surfaces. */
export const Elevation = {
    card: {
        shadowColor: '#452314',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 3,
    },
    floating: {
        shadowColor: '#C94E16',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 14,
        elevation: 8,
    },
};
