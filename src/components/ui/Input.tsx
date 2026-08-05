import React, { forwardRef } from 'react';
import { TextInput, View, Text, TextInputProps } from 'react-native';
import { Colors } from '@/shared/constants/theme';
import { cn } from '@/shared/lib/utils';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    containerClassName?: string;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
    { label, error, containerClassName, className, style, ...props },
    ref,
) {
    return (
        <View className={cn("mb-4", containerClassName)}>
            {label && (
                <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {label}
                </Text>
            )}
            <TextInput
                ref={ref}
                className={cn(
                    "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-50",
                    error && "border-red-500 focus:ring-red-500",
                    className
                )}
                placeholderTextColor={Colors.light.icon} // adjust based on theme
                style={style}
                cursorColor={Colors.light.tint}
                {...props}
            />
            {error && (
                <Text className="mt-1 text-xs text-red-500">{error}</Text>
            )}
        </View>
    );
});
