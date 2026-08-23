import { Checkbox } from '@/components/ui/Checkbox';
import { CreateEventHeader } from '@/components/ui/CreateEventHeader';
import { WellcomeBottomBar, WellcomeButton } from '@/components/ui/wellcome';
import { DishInputCard } from '@/components/ui/DishInputCard';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { WizardProgress } from '@/components/ui/WizardProgress';
import { validateEventStep } from '@/features/create-event/model/eventCreationValidation';
import { useEventCreation } from '@/shared/context/EventCreationContext';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }} edges={['top', 'bottom']}>
            <CreateEventHeader saveStatus={creation.saveStatus} />
            <KeyboardAwareScrollView contentContainerStyle={{ paddingHorizontal: horizontalPadding, paddingBottom: 120 }} keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
                <WizardProgress currentStep={1} />
                <Text className="text-2xl font-extrabold text-[#1A1A1A] mt-3">Monte o cardÃ¡pio</Text>
                <Text className="text-sm text-gray-500 mt-1 mb-5">Apresente os pratos na ordem em que serÃ£o servidos.</Text>

                <View className="bg-gray-50 border border-gray-200 p-4 mb-5" style={{ borderRadius: 8 }}>
                    <Checkbox label="ServiÃ§o em sequÃªncia" checked={creation.data.isServedInSequence} onChange={creation.setServedInSequence} />
                    <Text className="text-xs text-gray-500 mt-2 ml-8">Entrada, prato principal e sobremesa servidos em etapas.</Text>
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
                {errors.dishes && <Text className="text-xs text-red-600 mb-3">{errors.dishes}</Text>}

                <TouchableOpacity
                    className="flex-row items-center justify-center border border-dashed border-orange-400 bg-orange-50 py-4 mb-6"
                    style={{ borderRadius: 8 }}
                    onPress={() => creation.addDish({ id: Crypto.randomUUID(), name: '', description: '', category: '' })}
                    accessibilityRole="button"
                >
                    <Ionicons name="add" size={20} color="#C45D22" />
                    <Text className="text-[#C45D22] font-bold ml-2">Adicionar prato</Text>
                </TouchableOpacity>

                <Text className="text-lg font-bold text-[#1A1A1A] mb-3">InformaÃ§Ãµes alimentares</Text>
                <View className="gap-4 pb-4">
                    <Checkbox label="OpÃ§Ãµes veganas e vegetarianas disponÃ­veis" checked={creation.data.veganOptions} onChange={creation.setVeganOptions} />
                    <Checkbox label="Aceito adaptaÃ§Ãµes por restriÃ§Ãµes alimentares" checked={creation.data.substitutions} onChange={creation.setSubstitutions} />
                    <Checkbox label="CardÃ¡pio sujeito a alteraÃ§Ãµes de ingredientes" checked={creation.data.menuAlterations} onChange={creation.setMenuAlterations} />
                </View>
            </KeyboardAwareScrollView>

            <WellcomeBottomBar>
                <WellcomeButton label="Continuar" onPress={() => void handleNext()} />
            </WellcomeBottomBar>
        </SafeAreaView>
    );
}
