import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface SelectionGridItemProps {
    label: string;
    selected: boolean;
    onPress: () => void;
}

export function SelectionGridItem({ label, selected, onPress }: SelectionGridItemProps) {
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
            className="w-[31%] mb-3"
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
        >
            <Animated.View style={animatedStyle} className="w-full">
                {/* Fixed height on purpose: a percentage width plus aspect-ratio inside a
                    flex-wrap row is measured too short on Android (new architecture), which
                    cut off the rest of the scroll view below the grid. */}
                <View
                    className={`w-full h-[72px] items-center justify-center p-2 rounded-2xl border ${selected
                        ? 'bg-orange-50 border-[#FF8C42]'
                        : 'bg-white border-gray-200'
                        }`}
                >
                    <Text
                        className={`text-[12px] font-bold text-center leading-4 ${selected ? 'text-orange-700' : 'text-gray-600'}`}
                    >
                        {label}
                    </Text>
                </View>
            </Animated.View>
        </Pressable>
    );
}
