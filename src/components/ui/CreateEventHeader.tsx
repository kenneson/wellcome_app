import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface CreateEventHeaderProps {
    title?: string;
    onBack?: () => void;
}

export function CreateEventHeader({ title = "Crie seu evento", onBack }: CreateEventHeaderProps) {
    const router = useRouter();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)');
        }
    };

    return (
        <View className="h-[56px] flex-row items-center justify-between px-6 bg-white">
            <TouchableOpacity
                onPress={handleBack}
                className="w-10 h-10 -ml-2 items-center justify-center"
                activeOpacity={0.7}
            >
                <IconSymbol name="chevron.left" size={24} color="#333333" />
            </TouchableOpacity>

            <Text className="text-[17px] font-bold text-[#333333] text-center flex-1">
                {title}
            </Text>

            <View className="w-10" />
        </View>
    );
}
