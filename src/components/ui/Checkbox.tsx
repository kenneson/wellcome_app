import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import RCheckbox from '@/shared/ui/organisms/check-box'; // Default export
import { Colors } from '@/shared/constants/theme';

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
            accessibilityRole="checkbox"
            accessibilityLabel={label}
            accessibilityState={{ checked }}
        >
            <RCheckbox
                checked={checked}
                checkmarkColor={Colors.light.tint} // Use app tint color (Orange)
                size={24} // Slightly larger for better visibility of stroke
                showBorder={true} // Ensure box is visible
            />
            <Text style={styles.label}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    label: {
        fontSize: 14,
        color: Colors.light.text, // Use theme text color
        flex: 1,
        marginLeft: 10, // Add spacing since Checkbox component is self-contained
    },
});
