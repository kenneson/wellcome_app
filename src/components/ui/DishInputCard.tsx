import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Dish } from '@/entities/event/model/types';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Input } from '@/components/ui/Input';

const CATEGORIES = [
    { value: 'ENTRADA', label: 'Entrada' },
    { value: 'PRATO_PRINCIPAL', label: 'Principal' },
    { value: 'SOBREMESA', label: 'Sobremesa' },
    { value: 'BEBIDA', label: 'Bebida' },
] as const;

interface DishInputCardProps {
    index: number;
    dish: Dish;
    onUpdate: (updates: Partial<Dish>) => void;
    onRemove: () => void;
}

export function DishInputCard({ index, dish, onUpdate, onRemove }: DishInputCardProps) {
    return (
        <Animated.View
            entering={FadeInDown.delay(index * 100).springify()}
            className="border border-gray-100 rounded-3xl p-5 mb-4 bg-white shadow-sm"
        >
            <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center gap-2">
                    <View className="w-6 h-6 rounded-full bg-orange-100 items-center justify-center">
                        <Text className="text-orange-600 text-xs font-bold">{index + 1}</Text>
                    </View>
                    <Text className="text-base font-bold text-[#1A1A1A]">Prato {index + 1}</Text>
                </View>
                {onRemove && (
                    <Text onPress={onRemove} className="text-red-500 text-xs font-bold">Remover</Text>
                )}
            </View>

            <View className="mb-4">
                <Text className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Categoria</Text>
                <View className="flex-row flex-wrap gap-2">
                    {CATEGORIES.map((cat) => {
                        const isSelected = dish.category === cat.value;
                        return (
                            <TouchableOpacity
                                key={cat.value}
                                onPress={() => onUpdate({ category: cat.value as Dish['category'] })}
                                className={`px-4 py-2 rounded-full border ${isSelected
                                        ? 'bg-[#FF8C42] border-[#FF8C42]'
                                        : 'bg-white border-gray-200'
                                    }`}
                                activeOpacity={0.7}
                            >
                                <Text className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-gray-600'
                                    }`}>
                                    {cat.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            <Input
                label="Nome do prato"
                placeholder="Ex: Tainha assada"
                value={dish.name}
                onChangeText={(text) => onUpdate({ name: text })}
                containerClassName="mb-4"
                className="bg-gray-50 border-gray-100 rounded-xl"
            />

            <Input
                label="Descrição"
                placeholder="Dica: Descreva ingredientes, preparo..."
                value={dish.description}
                onChangeText={(text) => onUpdate({ description: text })}
                multiline
                textAlignVertical="top"
                className="h-[100px] bg-gray-50 border-gray-100 rounded-xl"
                containerClassName="mb-0"
            />
        </Animated.View>
    );
}
