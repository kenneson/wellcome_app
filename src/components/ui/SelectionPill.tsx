import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Palette, Spacing } from '@/shared/constants/theme';
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
        scale.set(withSpring(0.95));
    };

    const handlePressOut = () => {
        scale.set(withSpring(1));
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
                <View style={[styles.pill, selected && styles.pillSelected]}>
                    <Text style={[styles.text, selected && styles.textSelected]}>
                        {label}
                    </Text>
                </View>
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    pill: {
        minHeight: 40,
        justifyContent: 'center',
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Palette.line,
        backgroundColor: Palette.surface,
    },
    pillSelected: {
        borderColor: Palette.orange,
        backgroundColor: Palette.orangeSoft,
    },
    text: {
        fontSize: 13,
        fontWeight: '700',
        color: Palette.inkSoft,
    },
    textSelected: {
        fontWeight: '800',
        color: Palette.orangeDeep,
    },
});
