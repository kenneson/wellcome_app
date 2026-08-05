import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface SelectionPillProps {
    label: string;
    selected: boolean;
    onPress: () => void;
}

export function SelectionPill({ label, selected, onPress }: SelectionPillProps) {
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
            accessibilityRole="checkbox"
            accessibilityLabel={label}
            accessibilityState={{ checked: selected }}
        >
            <Animated.View style={animatedStyle}>
                <View
                    className={`px-4 py-2 rounded-full border ${selected
                        ? 'bg-orange-50 border-[#FF8C42]'
                        : 'bg-white border-gray-200'
                        }`}
                >
                    <Text
                        className={`text-[13px] font-medium ${selected ? 'text-orange-700' : 'text-gray-600'}`}
                    >
                        {label}
                    </Text>
                </View>
            </Animated.View>
        </Pressable>
    );
}
