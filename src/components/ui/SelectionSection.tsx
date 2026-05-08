import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
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
    theme?: 'default' | 'host';
}

export const SelectionSection = React.memo<SelectionSectionProps>(({
    title,
    subtitle,
    items,
    selectedItems,
    onSelect,
    isMultiSelect = false,
    variant = 'card',
    theme = 'default',
}) => {
    const isSelected = useCallback((item: string) => {
        if (isMultiSelect && Array.isArray(selectedItems)) {
            return selectedItems.includes(item);
        }
        return selectedItems === item;
    }, [selectedItems, isMultiSelect]);

    return (
        <View>
            <Text className="text-lg font-bold mb-2 mt-2.5 text-[#1A1A1A]">{title}</Text>
            {subtitle && <Text className="text-sm text-gray-500 mb-4">{subtitle}</Text>}

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
                                theme={theme}
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
                                theme={theme}
                            />
                        );
                    }

                    return (
                        <SelectionCard
                            key={item}
                            label={item}
                            selected={selected}
                            onPress={handlePress}
                            theme={theme}
                        />
                    );
                })}
                {/* Spacer logic for grid consistency if needed, but flex-wrap justify-between works ok for 3 cols if strict width */}
            </View>
        </View>
    );
});

SelectionSection.displayName = 'SelectionSection';
