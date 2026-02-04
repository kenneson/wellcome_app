import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';

interface SelectionCardProps {
    label: string;
    selected: boolean;
    onPress: () => void;
    style?: ViewStyle;
}

export function SelectionCard({ label, selected, onPress, style }: SelectionCardProps) {
    return (
        <TouchableOpacity
            style={[
                styles.container,
                selected ? styles.selected : styles.unselected,
                style
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Text style={[
                styles.text,
                selected ? styles.textSelected : styles.textUnselected
            ]}>
                {label}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20, // Rounded pill shape
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 80,
    },
    unselected: {
        backgroundColor: '#fff',
        borderColor: '#E0E0E0',
    },
    selected: {
        backgroundColor: '#FFF0E5', // Light orange background for selected
        borderColor: '#FF8C42',
    },
    text: {
        fontSize: 14,
        fontWeight: '500',
    },
    textUnselected: {
        color: '#333',
    },
    textSelected: {
        color: '#FF8C42',
    },
});
