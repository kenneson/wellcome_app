import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface SelectionGridItemProps {
    label: string;
    selected: boolean;
    onPress: () => void;
    theme?: 'default' | 'host';
}

export function SelectionGridItem({ label, selected, onPress, theme = 'default' }: SelectionGridItemProps) {
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
        >
            <Animated.View style={animatedStyle} className="w-full">
                <View
                    className={`w-full aspect-[1.3] items-center justify-center p-2 rounded-2xl border ${selected
                        ? theme === 'host'
                            ? 'bg-emerald-50 border-[#10B981]'
                            : 'bg-orange-50 border-[#FF8C42]'
                        : 'bg-white border-gray-200'
                        }`}
                >
                    <Text
                        className={`text-[12px] font-bold text-center leading-4 ${selected ? (theme === 'host' ? 'text-emerald-700' : 'text-orange-700') : 'text-gray-600'}`}
                    >
                        {label}
                    </Text>
                </View>
            </Animated.View>
        </Pressable>
    );
}
