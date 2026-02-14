import React from 'react';
import { type TouchableOpacityProps, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { cssInterop } from 'nativewind';
import RButton from '@/shared/ui/base/button';
import { Colors } from '@/shared/constants/theme';
import { cn } from '@/shared/lib/utils'; // Assuming this exists, used for merging existing classes if needed

// Make Reacticx Button compatible with NativeWind
const ReacticxButton = cssInterop(RButton, {
    className: 'style',
    loadingTextStyle: 'loadingTextStyle'
});

interface ButtonProps extends TouchableOpacityProps {
    variant?: 'default' | 'destructive' | 'outline' | 'ghost' | 'secondary' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    isLoading?: boolean;
    children: React.ReactNode;
    className?: string; // NativeWind class
    textClassName?: string;
    // Support bypassing variant styles
    width?: number;
    height?: number;
}

export function Button({
    variant = 'default',
    size = 'default',
    isLoading = false,
    children,
    className,
    textClassName,
    disabled,
    style,
    ...props
}: ButtonProps) {

    // Map variants to specific styles (colors)
    const variantStyles: Record<string, {
        backgroundColor: string;
        textColor: string;
        borderStyle?: StyleProp<ViewStyle>;
    }> = {
        default: {
            backgroundColor: '#0f172a', // slate-900
            textColor: '#f8fafc' // slate-50
        },
        destructive: {
            backgroundColor: '#ef4444', // red-500
            textColor: '#f8fafc'
        },
        outline: {
            backgroundColor: 'transparent',
            textColor: '#0f172a', // slate-900
            borderStyle: { borderWidth: 1, borderColor: '#e2e8f0' } // slate-200
        },
        secondary: {
            backgroundColor: '#f1f5f9', // slate-100
            textColor: '#0f172a'
        },
        ghost: {
            backgroundColor: 'transparent',
            textColor: '#0f172a'
        },
        link: {
            backgroundColor: 'transparent',
            textColor: '#0f172a'
        },
    };

    // Map sizes to dimensions
    const sizeStyles: Record<string, { height: number; paddingHorizontal?: number; width?: number }> = {
        default: { height: 40, paddingHorizontal: 16 },
        sm: { height: 36, paddingHorizontal: 12 },
        lg: { height: 44, paddingHorizontal: 32 },
        icon: { height: 40, width: 40, paddingHorizontal: 0 },
    };

    const currentVariant = variantStyles[variant] || variantStyles.default;
    const currentSize = sizeStyles[size] || sizeStyles.default;

    // Reacticx Button expects explicit width/height sometimes, but supports style override.
    // We pass explicit height to ensure animation works correctly if it relies on it.

    return (
        <ReacticxButton
            onPress={props.onPress}
            disabled={disabled || isLoading}
            isLoading={isLoading}
            // Colors
            backgroundColor={currentVariant.backgroundColor}
            loadingTextColor={currentVariant.textColor}
            loadingTextBackgroundColor={currentVariant.backgroundColor} // When loading, keep same bg? Or maybe slightly different

            // Dimensions
            height={currentSize.height}
            width={currentSize.width} // Undefined for non-icon, handled by style? 
            // Reacticx defaults width=200. We need to override this.

            // Text Styles (passed as children usually, but Reacticx renders children inside)
            // We can style the text inside children if it's a Text component.
            // If children is string, Reacticx doesn't auto-wrap in Text with specific style?
            // Let's check Reacticx implementation. It just renders {children}.
            // So we need to ensure children is a Text component with correct color.

            // Style overrides
            style={[
                // If width is undefined in currentSize (default/sm/lg), we want flexible width
                // But Reacticx forces width prop. 
                // We should pass width via style to override default 200.
                !currentSize.width && { width: 'auto', minWidth: currentSize.paddingHorizontal ? currentSize.paddingHorizontal * 2 : undefined },

                // Add padding manually since Reacticx uses centered Flexbox
                { paddingHorizontal: currentSize.paddingHorizontal },

                currentVariant.borderStyle,

                // NativeWind will pass style via className, but we also pass style prop
                style
            ]}
            className={className} // Passed to style via cssInterop

            // Props for loading
            loadingText="Carregando..."
            showLoadingIndicator={true}
        >
            {/* If children is string, wrap in Text to apply variant color */}
            {typeof children === 'string' ? (
                <React.Fragment>
                    {/* We use a text element that supports className or style */}
                    <CommonText
                        className={cn("font-medium text-sm", textClassName)}
                        style={{ color: currentVariant.textColor }}
                    >
                        {children}
                    </CommonText>
                </React.Fragment>
            ) : children}
        </ReacticxButton>
    );
}

// Temporary Text wrapper if needed, or just import Text
import { Text } from 'react-native';
function CommonText({ children, style, className }: { children: React.ReactNode, style?: any, className?: string }) {
    // We can just use standard Text with className if configured, or just pass style
    // Since we don't know if Text is interop'd globally for className (usually yes in strict nativewind)
    // We'll create a quick wrapper.
    const SimpleText = cssInterop(Text, { className: 'style' });
    return <SimpleText style={style} className={className}>{children}</SimpleText>;
}
