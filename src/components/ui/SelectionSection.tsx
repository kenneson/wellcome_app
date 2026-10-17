import React, { useCallback } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Palette, Spacing } from '@/shared/constants/theme';
import { SelectionCard } from '@/components/ui/SelectionCard';
import { SelectionPill } from '@/components/ui/SelectionPill';
import { SelectionGridItem } from '@/components/ui/SelectionGridItem';

interface SelectionSectionProps {
    title: string;
    subtitle?: string;
    items: readonly string[];
    selectedItems: string | string[];
    onSelect: (item: string) => void;
    isMultiSelect?: boolean;
    variant?: 'card' | 'pill' | 'grid';
}

export const SelectionSection = React.memo<SelectionSectionProps>(({
    title,
    subtitle,
    items,
    selectedItems,
    onSelect,
    isMultiSelect = false,
    variant = 'card',
}) => {
    const isSelected = useCallback((item: string) => {
        if (isMultiSelect && Array.isArray(selectedItems)) {
            return selectedItems.includes(item);
        }
        return selectedItems === item;
    }, [selectedItems, isMultiSelect]);

    return (
        <View>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

            <View className={`flex-row flex-wrap ${variant === 'grid' ? 'justify-between' : 'gap-2.5'}`}>
                {items.map((item) => {
                    const selected = isSelected(item);
                    const handlePress = () => onSelect(item);

                    if (variant === 'pill') {
                        return (
                            <SelectionPill
                                key={item}
                                label={item}
                                selected={selected}
                                onPress={handlePress}
                            />
                        );
                    }

                    if (variant === 'grid') {
                        return (
                            <SelectionGridItem
                                key={item}
                                label={item}
                                selected={selected}
                                onPress={handlePress}
                            />
                        );
                    }

                    return (
                        <SelectionCard
                            key={item}
                            label={item}
                            selected={selected}
                            onPress={handlePress}
                        />
                    );
                })}
                {/* Spacer logic for grid consistency if needed, but flex-wrap justify-between works ok for 3 cols if strict width */}
            </View>
        </View>
    );
});

SelectionSection.displayName = 'SelectionSection';

const styles = StyleSheet.create({
    title: {
        fontSize: 18,
        fontWeight: '800',
        color: Palette.ink,
        marginTop: 10,
        marginBottom: Spacing.sm,
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 21,
        color: Palette.inkSoft,
        marginBottom: Spacing.lg,
    },
});
