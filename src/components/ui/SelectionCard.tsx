import React from 'react';
import { Pressable, Text, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface SelectionCardProps {
    label: string;
    description?: string;
    selected: boolean;
    onPress: () => void;
    style?: ViewStyle;
}

export function SelectionCard({ label, description, selected, onPress, style }: SelectionCardProps) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.98);
    };

    const handlePressOut = () => {
        scale.value = withSpring(1);
    };

    return (
        <Pressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={style}
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityHint={description}
            accessibilityState={{ selected }}
        >
            <Animated.View style={animatedStyle}>
                <View
                    className={`py-4 px-6 rounded-2xl border min-w-[100px] shadow-sm ${selected
                        ? 'bg-[#FFF5F0] border-[#FF8C42] shadow-orange-200/50'
                        : 'bg-white border-gray-100 shadow-gray-200/50'
                        }`}
                >
                    <View className="items-start">
                        <Text
                            className={`text-[15px] font-bold mb-1 ${selected ? 'text-[#1A1A1A]' : 'text-gray-600'}`}
                        >
                            {label}
                        </Text>
                        {description && (
                            <Text
                                className={`text-[13px] leading-5 ${selected ? 'text-orange-700' : 'text-gray-400'}`}
                            >
                                {description}
                            </Text>
                        )}
                    </View>
                </View>
            </Animated.View>
        </Pressable>
    );
}
