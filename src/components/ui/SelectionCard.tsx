import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, View } from 'react-native';

interface SelectionCardProps {
    label: string;
    description?: string;
    selected: boolean;
    onPress: () => void;
    style?: ViewStyle;
}

export function SelectionCard({ label, description, selected, onPress, style }: SelectionCardProps) {
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
            <View style={styles.content}>
                <Text style={[
                    styles.text,
                    selected ? styles.textSelected : styles.textUnselected
                ]}>
                    {label}
                </Text>
                {description && (
                    <Text style={[
                        styles.description,
                        selected ? styles.descriptionSelected : styles.descriptionUnselected
                    ]}>
                        {description}
                    </Text>
                )}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        minWidth: 80,
    },
    content: {
        alignItems: 'flex-start',
    },
    unselected: {
        backgroundColor: '#fff',
        borderColor: '#E0E0E0',
    },
    selected: {
        backgroundColor: '#FFF0E5',
        borderColor: '#FF8C42',
    },
    text: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    description: {
        fontSize: 13,
    },
    textUnselected: {
        color: '#333',
    },
    textSelected: {
        color: '#FF8C42',
    },
    descriptionUnselected: {
        color: '#666',
    },
    descriptionSelected: {
        color: '#E67A35',
    },
});
