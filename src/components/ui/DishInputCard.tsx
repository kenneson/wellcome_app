import React, { useEffect, useRef, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import { Dish } from '@/entities/event/model/types';
import { Input } from '@/components/ui/Input';

const CATEGORIES = [
    { value: 'ENTRADA', label: 'Entrada' },
    { value: 'PRATO_PRINCIPAL', label: 'Principal' },
    { value: 'SOBREMESA', label: 'Sobremesa' },
    { value: 'BEBIDA', label: 'Bebida' },
] as const;

interface DishInputCardProps {
    index: number;
    total: number;
    dish: Dish;
    errors?: { name?: string; category?: string };
    onUpdate: (updates: Partial<Dish>) => void;
    onRemove: () => void;
    onDuplicate: () => void;
    onMove: (direction: -1 | 1) => void;
    focusName?: boolean;
}

export function DishInputCard({ index, total, dish, errors, onUpdate, onRemove, onDuplicate, onMove, focusName }: DishInputCardProps) {
    const [expanded, setExpanded] = useState(true);
    const nameRef = useRef<TextInput>(null);
    const categoryLabel = CATEGORIES.find((category) => category.value === dish.category)?.label;

    useEffect(() => {
        if (!focusName) return;
        setExpanded(true);
        requestAnimationFrame(() => nameRef.current?.focus());
    }, [focusName]);

    return (
        <View className="border border-gray-200 mb-3 bg-white overflow-hidden" style={{ borderRadius: 8 }}>
            <TouchableOpacity
                className="flex-row items-center px-4 py-3"
                onPress={() => setExpanded((value) => !value)}
                accessibilityRole="button"
                accessibilityLabel={`${expanded ? 'Recolher' : 'Expandir'} prato ${index + 1}`}
            >
                <View className="w-7 h-7 bg-orange-100 items-center justify-center mr-3" style={{ borderRadius: 8 }}>
                    <Text className="text-orange-700 text-xs font-bold">{index + 1}</Text>
                </View>
                <View className="flex-1">
                    <Text className="text-base font-bold text-[#1A1A1A]" numberOfLines={1}>{dish.name || `Prato ${index + 1}`}</Text>
                    <Text className="text-xs text-gray-500 mt-0.5">{categoryLabel || 'Categoria pendente'}</Text>
                </View>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color="#73787E" />
            </TouchableOpacity>

            {expanded && (
                <View className="px-4 pb-4 border-t border-gray-100 pt-4">
                    <Text className="text-xs font-bold text-gray-600 mb-2">CATEGORIA</Text>
                    <View className="flex-row flex-wrap gap-2 mb-1">
                        {CATEGORIES.map((category) => {
                            const selected = dish.category === category.value;
                            return (
                                <TouchableOpacity
                                    key={category.value}
                                    onPress={() => onUpdate({ category: category.value })}
                                    className={`px-3 py-2 border ${selected ? 'bg-[#FF8C42] border-[#FF8C42]' : 'bg-white border-gray-300'}`}
                                    style={{ borderRadius: 8 }}
                                    accessibilityRole="radio"
                                    accessibilityState={{ selected }}
                                >
                                    <Text className={`text-xs font-bold ${selected ? 'text-white' : 'text-gray-700'}`}>{category.label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    {errors?.category && <Text className="text-xs text-red-600 mb-3">{errors.category}</Text>}

                    <Input
                        ref={nameRef}
                        label="Nome do prato"
                        placeholder="Ex: Tainha assada"
                        value={dish.name}
                        maxLength={80}
                        onChangeText={(name) => onUpdate({ name })}
                        containerClassName="mb-3"
                        className={`bg-gray-50 rounded-lg ${errors?.name ? 'border-red-400' : 'border-gray-200'}`}
                    />
                    {errors?.name && <Text className="text-xs text-red-600 -mt-2 mb-3">{errors.name}</Text>}
                    <Input
                        label="Descrição opcional"
                        placeholder="Ingredientes e modo de preparo"
                        value={dish.description}
                        maxLength={300}
                        onChangeText={(description) => onUpdate({ description })}
                        multiline
                        textAlignVertical="top"
                        className="h-[88px] bg-gray-50 border-gray-200 rounded-lg"
                    />

                    <View className="flex-row justify-end gap-1 mt-3">
                        <IconButton icon="arrow-up" label="Mover prato para cima" disabled={index === 0} onPress={() => onMove(-1)} />
                        <IconButton icon="arrow-down" label="Mover prato para baixo" disabled={index === total - 1} onPress={() => onMove(1)} />
                        <IconButton icon="copy-outline" label="Duplicar prato" onPress={onDuplicate} />
                        <IconButton icon="trash-outline" label="Remover prato" danger disabled={total === 1} onPress={onRemove} />
                    </View>
                </View>
            )}
        </View>
    );
}

function IconButton({ icon, label, onPress, disabled, danger }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; disabled?: boolean; danger?: boolean }) {
    return (
        <TouchableOpacity
            className="w-11 h-11 items-center justify-center"
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ disabled }}
        >
            <Ionicons name={icon} size={20} color={disabled ? '#D1D5DB' : danger ? '#B33A34' : '#5D646A'} />
        </TouchableOpacity>
    );
}
