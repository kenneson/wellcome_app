import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface SelectionPillProps {
    label: string;
    selected: boolean;
    onPress: () => void;
    theme?: 'default' | 'host';
}

export function SelectionPill({ label, selected, onPress, theme = 'default' }: SelectionPillProps) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.95);
    };

    const handlePressOut = () => {
        scale.value = withSpring(1);
    };

    return (
        <Pressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
        >
            <Animated.View style={animatedStyle}>
                <View
                    className={`px-4 py-2 rounded-full border ${selected
                        ? theme === 'host'
                            ? 'bg-emerald-50 border-[#10B981]'
                            : 'bg-orange-50 border-[#FF8C42]'
                        : 'bg-white border-gray-200'
                        }`}
                >
                    <Text
                        className={`text-[13px] font-medium ${selected ? (theme === 'host' ? 'text-emerald-700' : 'text-orange-700') : 'text-gray-600'}`}
                    >
                        {label}
                    </Text>
                </View>
            </Animated.View>
        </Pressable>
    );
}
