import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, type TouchableOpacityProps } from 'react-native';
import { cn } from '@/shared/lib/utils';
import { Colors } from '@/shared/constants/theme';

interface ButtonProps extends TouchableOpacityProps {
    variant?: 'default' | 'destructive' | 'outline' | 'ghost' | 'secondary' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    isLoading?: boolean;
    children: React.ReactNode;
    className?: string;
    textClassName?: string;
}

export function Button({
    variant = 'default',
    size = 'default',
    isLoading = false,
    children,
    className,
    textClassName,
    disabled,
    ...props
}: ButtonProps) {
    const baseStyles = "flex-row items-center justify-center rounded-md font-medium disabled:opacity-50";

    const variants = {
        default: "bg-slate-900",
        destructive: "bg-red-500",
        outline: "border border-slate-200 bg-transparent",
        secondary: "bg-slate-100",
        ghost: "bg-transparent", // hover effect is tricky in React Native without Pressable state
        link: "bg-transparent underline-offset-4"
    };

    const sizes = {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10"
    };

    const textBaseStyles = "text-sm font-medium";

    const textVariants = {
        default: "text-slate-50",
        destructive: "text-slate-50",
        outline: "text-slate-900",
        secondary: "text-slate-900",
        ghost: "text-slate-900",
        link: "text-slate-900 underline"
    };

    const containerStyle = cn(baseStyles, variants[variant], sizes[size], className);
    const textStyle = cn(textBaseStyles, textVariants[variant], textClassName);

    return (
        <TouchableOpacity
            className={containerStyle}
            activeOpacity={0.7}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <ActivityIndicator
                    size="small"
                    color={variant === 'outline' || variant === 'ghost' || variant === 'secondary' ? Colors.light.text : '#fff'}
                    className="mr-2"
                />
            ) : null}
            {typeof children === 'string' ? (
                <Text className={textStyle}>{children}</Text>
            ) : (
                children
            )}
        </TouchableOpacity>
    );
}
