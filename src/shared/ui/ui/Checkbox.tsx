import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, ViewStyle } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface CheckboxProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    style?: ViewStyle;
}

export function Checkbox({ label, checked, onChange, style }: CheckboxProps) {
    return (
        <TouchableOpacity
            style={[styles.container, style]}
            onPress={() => onChange(!checked)}
            activeOpacity={0.7}
        >
            <View style={[styles.box, checked ? styles.checkedBox : styles.uncheckedBox]}>
                {checked && <IconSymbol name="checkmark" size={12} color="#FFF" />}
            </View>
            <Text style={styles.label}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center', // Aligns box and first line of text
    },
    box: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    checkedBox: {
        backgroundColor: '#FF8C42',
        borderColor: '#FF8C42',
    },
    uncheckedBox: {
        backgroundColor: 'transparent',
        borderColor: '#C4C4C4',
    },
    label: {
        fontSize: 14,
        color: '#333',
        flex: 1, // Allow text to wrap if needed
    },
});
