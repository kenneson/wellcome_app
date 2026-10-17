import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BorderRadius, Palette, Spacing } from '@/shared/constants/theme';
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
        // eslint-disable-next-line react-hooks/set-state-in-effect -- expand the card when it receives focus from validation
        setExpanded(true);
        requestAnimationFrame(() => nameRef.current?.focus());
    }, [focusName]);

    return (
        <View style={styles.card}>
            <TouchableOpacity
                style={styles.summary}
                onPress={() => setExpanded((value) => !value)}
                accessibilityRole="button"
                accessibilityLabel={`${expanded ? 'Recolher' : 'Expandir'} prato ${index + 1}`}
            >
                <View style={styles.indexBadge}>
                    <Text style={styles.indexText}>{index + 1}</Text>
                </View>
                <View style={styles.summaryText}>
                    <Text style={styles.dishName} numberOfLines={1}>{dish.name || `Prato ${index + 1}`}</Text>
                    <Text style={[styles.dishCategory, !categoryLabel && styles.dishCategoryPending]}>{categoryLabel || 'Categoria pendente'}</Text>
                </View>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={Palette.muted} />
            </TouchableOpacity>

            {expanded && (
                <View style={styles.body}>
                    <Text style={styles.sectionLabel}>CATEGORIA</Text>
                    <View style={styles.chips}>
                        {CATEGORIES.map((category) => {
                            const selected = dish.category === category.value;
                            return (
                                <TouchableOpacity
                                    key={category.value}
                                    onPress={() => onUpdate({ category: category.value })}
                                    style={[styles.chip, selected && styles.chipSelected]}
                                    accessibilityRole="radio"
                                    accessibilityState={{ selected }}
                                >
                                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{category.label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    {errors?.category && <Text style={[styles.error, styles.categoryError]}>{errors.category}</Text>}

                    <Input
                        ref={nameRef}
                        label="Nome do prato"
                        placeholder="Ex: Tainha assada"
                        value={dish.name}
                        maxLength={80}
                        onChangeText={(name) => onUpdate({ name })}
                        containerClassName="mb-3 mt-3"
                        placeholderTextColor={Palette.subtle}
                        style={[styles.input, errors?.name && styles.inputError]}
                    />
                    {errors?.name && <Text style={[styles.error, styles.nameError]}>{errors.name}</Text>}
                    <Input
                        label="Descrição opcional"
                        placeholder="Ingredientes e modo de preparo"
                        value={dish.description}
                        maxLength={300}
                        onChangeText={(description) => onUpdate({ description })}
                        multiline
                        textAlignVertical="top"
                        placeholderTextColor={Palette.subtle}
                        style={[styles.input, styles.inputMultiline]}
                    />

                    <View style={styles.toolbar}>
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
            style={styles.iconButton}
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ disabled }}
        >
            <Ionicons name={icon} size={20} color={disabled ? Palette.subtle : danger ? Palette.danger : Palette.inkSoft} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        marginBottom: Spacing.md,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        backgroundColor: Palette.surface,
        overflow: 'hidden',
    },
    summary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        minHeight: 56,
        paddingHorizontal: 14,
        paddingVertical: Spacing.md,
    },
    indexBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Palette.orangeSoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    indexText: {
        fontSize: 13,
        fontWeight: '800',
        color: Palette.orangeDeep,
    },
    summaryText: {
        flex: 1,
        gap: 2,
    },
    dishName: {
        fontSize: 16,
        fontWeight: '800',
        color: Palette.ink,
    },
    dishCategory: {
        fontSize: 13,
        color: Palette.inkSoft,
    },
    dishCategoryPending: {
        color: Palette.muted,
    },
    body: {
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 14,
        borderTopWidth: 1,
        borderTopColor: Palette.lineSoft,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.8,
        color: Palette.inkSoft,
        marginBottom: Spacing.sm,
    },
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginBottom: Spacing.xs,
    },
    chip: {
        minHeight: 36,
        justifyContent: 'center',
        paddingHorizontal: 14,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Palette.line,
        backgroundColor: Palette.surface,
    },
    chipSelected: {
        backgroundColor: Palette.orange,
        borderColor: Palette.orange,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '800',
        color: Palette.inkSoft,
    },
    chipTextSelected: {
        color: '#FFFFFF',
    },
    input: {
        minHeight: 48,
        height: undefined,
        paddingHorizontal: 14,
        paddingVertical: Spacing.md,
        fontSize: 15,
        color: Palette.ink,
        backgroundColor: Palette.surface,
        borderWidth: 1,
        borderColor: Palette.line,
        borderRadius: BorderRadius.lg,
    },
    inputError: {
        borderColor: Palette.danger,
    },
    inputMultiline: {
        minHeight: 88,
    },
    error: {
        fontSize: 12,
        color: Palette.danger,
    },
    categoryError: {
        marginTop: Spacing.xs,
    },
    nameError: {
        marginTop: -Spacing.sm,
        marginBottom: Spacing.md,
    },
    toolbar: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: Spacing.xs,
        marginTop: Spacing.md,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
