import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Dish } from '@/context/EventCreationContext';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface DishInputCardProps {
    index: number;
    dish: Dish;
    onUpdate: (updates: Partial<Dish>) => void;
    onRemove: () => void; // Optional if we want to allow removing
}

export function DishInputCard({ index, dish, onUpdate }: DishInputCardProps) {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.dragHandle}>
                    <IconSymbol name="list.bullet" size={16} color="#999" />
                </View>
                <Text style={styles.title}>Prato {index + 1}</Text>
            </View>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Nome do prato</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ex: Tainha assada"
                    value={dish.name}
                    onChangeText={(text) => onUpdate({ name: text })}
                />
            </View>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>Descrição do evento</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Dica: Descreva ingredientes, como é o preparo e outras informações que ajudem o convidado a entender o que irá comer"
                    value={dish.description}
                    onChangeText={(text) => onUpdate({ description: text })}
                    multiline
                    textAlignVertical="top"
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    dragHandle: {
        marginRight: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    inputContainer: {
        marginBottom: 12,
    },
    label: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
    },
    textArea: {
        height: 100,
    },
});
