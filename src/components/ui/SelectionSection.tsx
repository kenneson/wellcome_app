import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SelectionCard } from '@/components/ui/SelectionCard';

interface SelectionSectionProps {
    title: string;
    subtitle?: string;
    items: readonly string[];
    selectedItems: string | string[];
    onSelect: (item: string) => void;
    isMultiSelect?: boolean;
}

export const SelectionSection = React.memo<SelectionSectionProps>(({
    title,
    subtitle,
    items,
    selectedItems,
    onSelect,
    isMultiSelect = false,
}) => {
    const isSelected = useCallback((item: string) => {
        if (isMultiSelect && Array.isArray(selectedItems)) {
            return selectedItems.includes(item);
        }
        return selectedItems === item;
    }, [selectedItems, isMultiSelect]);

    return (
        <>
            <Text style={styles.sectionTitle}>{title}</Text>
            {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
            <View style={styles.grid}>
                {items.map((item) => (
                    <SelectionCard
                        key={item}
                        label={item}
                        selected={isSelected(item)}
                        onPress={() => onSelect(item)}
                        style={styles.card}
                    />
                ))}
            </View>
        </>
    );
});

SelectionSection.displayName = 'SelectionSection';

const styles = StyleSheet.create({
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
        marginTop: 10,
        color: '#000',
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    card: {
        flexGrow: 1,
    },
});
