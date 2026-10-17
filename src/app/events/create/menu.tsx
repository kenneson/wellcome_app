import { Checkbox } from '@/components/ui/Checkbox';
import { CreateEventHeader } from '@/components/ui/CreateEventHeader';
import { BrandSheet, WellcomeBottomBar, WellcomeButton } from '@/components/ui/wellcome';
import { DishInputCard } from '@/components/ui/DishInputCard';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { WizardProgress } from '@/components/ui/WizardProgress';
import { validateEventStep } from '@/features/create-event/model/eventCreationValidation';
import { useEventCreation } from '@/shared/context/EventCreationContext';
import { BorderRadius, Palette, Spacing } from '@/shared/constants/theme';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

export default function EventCreateMenu() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const horizontalPadding = width < 375 ? 16 : width >= 414 ? 24 : 20;
    const creation = useEventCreation();
    const { setCurrentStep } = creation;
    const [errors, setErrors] = useState<Record<string, string>>({});
    const firstInvalidDish = creation.data.dishes.findIndex((_, index) => !!errors[`dishes.${index}.name`]);

    useEffect(() => setCurrentStep(1), [setCurrentStep]);

    const handleNext = async () => {
        const nextErrors = validateEventStep(creation.data, 1);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;
        await creation.flushDraft();
        router.push('/events/create/location');
    };

    return (
        <View style={styles.screen}>
            <CreateEventHeader saveStatus={creation.saveStatus} />
            <BrandSheet>
                <KeyboardAwareScrollView contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]} keyboardShouldPersistTaps="handled" style={styles.flex}>
                    <WizardProgress currentStep={1} />
                    <Text style={styles.title}>Monte o cardápio</Text>
                    <Text style={styles.subtitle}>Apresente os pratos na ordem em que serão servidos.</Text>

                    <View style={styles.sequenceCard}>
                        <Checkbox label="Serviço em sequência" checked={creation.data.isServedInSequence} onChange={creation.setServedInSequence} />
                        <Text style={styles.sequenceHint}>Entrada, prato principal e sobremesa servidos em etapas.</Text>
                    </View>

                    {creation.data.dishes.map((dish, index) => (
                        <DishInputCard
                            key={dish.id}
                            index={index}
                            total={creation.data.dishes.length}
                            dish={dish}
                            focusName={index === firstInvalidDish}
                            errors={{ name: errors[`dishes.${index}.name`], category: errors[`dishes.${index}.category`] }}
                            onUpdate={(updates) => creation.updateDish(dish.id, { ...dish, ...updates })}
                            onRemove={() => creation.removeDish(dish.id)}
                            onDuplicate={() => creation.duplicateDish(dish.id)}
                            onMove={(direction) => creation.moveDish(dish.id, direction)}
                        />
                    ))}
                    {errors.dishes && <Text style={styles.error}>{errors.dishes}</Text>}

                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => creation.addDish({ id: Crypto.randomUUID(), name: '', description: '', category: '' })}
                        accessibilityRole="button"
                    >
                        <Ionicons name="add" size={20} color={Palette.orangeDeep} />
                        <Text style={styles.addButtonText}>Adicionar prato</Text>
                    </TouchableOpacity>

                    <Text style={styles.sectionTitle}>Informações alimentares</Text>
                    <View style={styles.dietCard}>
                        <Checkbox label="Opções veganas e vegetarianas disponíveis" checked={creation.data.veganOptions} onChange={creation.setVeganOptions} />
                        <Checkbox label="Aceito adaptações por restrições alimentares" checked={creation.data.substitutions} onChange={creation.setSubstitutions} />
                        <Checkbox label="Cardápio sujeito a alterações de ingredientes" checked={creation.data.menuAlterations} onChange={creation.setMenuAlterations} />
                    </View>
                </KeyboardAwareScrollView>
            </BrandSheet>

            <WellcomeBottomBar>
                <WellcomeButton label="Continuar" onPress={() => void handleNext()} />
            </WellcomeBottomBar>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Palette.paper,
    },
    flex: {
        flex: 1,
    },
    content: {
        paddingTop: Spacing.xl,
        paddingBottom: 120,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.3,
        color: Palette.ink,
        marginTop: Spacing.xl,
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 21,
        color: Palette.inkSoft,
        marginTop: Spacing.xs,
        marginBottom: Spacing.xl,
    },
    sequenceCard: {
        padding: 14,
        marginBottom: Spacing.xl,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        backgroundColor: Palette.surface,
    },
    sequenceHint: {
        fontSize: 13,
        lineHeight: 19,
        color: Palette.inkSoft,
        marginLeft: 34,
    },
    error: {
        fontSize: 12,
        color: Palette.danger,
        marginBottom: Spacing.md,
    },
    addButton: {
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.xxl,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: Palette.orange,
        backgroundColor: Palette.orangeSoft,
    },
    addButtonText: {
        fontSize: 15,
        fontWeight: '800',
        color: Palette.orangeDeep,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: Palette.ink,
        marginBottom: Spacing.md,
    },
    dietCard: {
        gap: Spacing.xs,
        paddingHorizontal: 14,
        paddingVertical: Spacing.sm,
        marginBottom: Spacing.lg,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        backgroundColor: Palette.surface,
    },
});
