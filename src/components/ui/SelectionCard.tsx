import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Palette } from '@/shared/constants/theme';
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
        scale.set(withSpring(0.98));
    };

    const handlePressOut = () => {
        scale.set(withSpring(1));
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
                <View style={[styles.card, selected && styles.cardSelected]}>
                    <View style={styles.content}>
                        <Text style={[styles.label, selected && styles.labelSelected]}>
                            {label}
                        </Text>
                        {description && (
                            <Text style={[styles.description, selected && styles.descriptionSelected]}>
                                {description}
                            </Text>
                        )}
                    </View>
                </View>
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        minWidth: 100,
        paddingVertical: 14,
        paddingHorizontal: 18,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        backgroundColor: Palette.surface,
    },
    cardSelected: {
        borderColor: Palette.orange,
        backgroundColor: Palette.orangeSoft,
    },
    content: {
        alignItems: 'flex-start',
        gap: 4,
    },
    label: {
        fontSize: 15,
        fontWeight: '800',
        color: Palette.inkSoft,
    },
    labelSelected: {
        color: Palette.ink,
    },
    description: {
        fontSize: 13,
        lineHeight: 19,
        color: Palette.muted,
    },
    descriptionSelected: {
        color: Palette.orangeDeep,
    },
});
