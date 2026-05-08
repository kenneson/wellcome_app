import { CreateEventHeader } from '@/components/ui/CreateEventHeader';
import { SelectionSection } from '@/components/ui/SelectionSection';
import { WizardProgress } from '@/components/ui/WizardProgress';
import { useEventCreation } from '@/shared/context/EventCreationContext';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================================================
// Constants
// ============================================================================

const EVENT_TYPES = [
    'Café da manhã', 'Brunch', 'Almoço',
    'Lanche', 'Jantar', 'Degustação',
    'Pic-nic', 'Coquetel', 'Outro'
] as const;

const CUISINE_TYPES = [
    'Africana', 'Alemã', 'Asiática', 'Árabe',
    'Argentina', 'Baiana', 'Brasileira', 'Carnes',
    'Café colonial', 'Chinesa', 'Colombiana',
    'Contemporânea', 'Coreana', 'Crepes',
    'Doces e bolos', 'Espanhola', 'Francesa',
    'Frutos do mar', 'Gaúcha', 'Grega',
    'Hamburguer', 'Indiana', 'Italiana',
    'Japonesa', 'Lanches', 'Mexicana', 'Mineira',
    'Mediterrânea', 'Nordestina', 'Pasteis',
    'Peruana', 'Pizza', 'Portuguesa',
    'Sopas e Caldos', 'Tailandesa', 'Variada',
    'Vegana', 'Vegetariana'
] as const;

// Desired design has no "Vibe" section in Step 1.

// ============================================================================
// Main Component
// ============================================================================

export default function EventCreateStep1() {
    const router = useRouter();
    const { data, setEventType, toggleCuisineType, updateDetails } = useEventCreation();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();

    const isSmallScreen = width < 375;
    const horizontalPadding = isSmallScreen ? 16 : width >= 414 ? 24 : 20;

    const canProceed = useMemo(() => {
        return (
            data.eventType &&
            data.cuisineTypes.length > 0 &&
            data.details.title?.trim() &&
            data.details.description?.trim()
        );
    }, [data.eventType, data.cuisineTypes.length, data.details.title, data.details.description]);

    const handleNext = useCallback(() => {
        if (!data.eventType) {
            Alert.alert('Atenção', 'Selecione o tipo do evento para continuar.');
            return;
        }
        if (data.cuisineTypes.length === 0) {
            Alert.alert('Atenção', 'Selecione pelo menos um tipo de comida.');
            return;
        }
        if (!data.details.title?.trim()) {
            Alert.alert('Atenção', 'Informe o título do evento.');
            return;
        }
        if (!data.details.description?.trim()) {
            Alert.alert('Atenção', 'Informe a descrição do evento.');
            return;
        }
        router.push('/events/create/menu');
    }, [data.eventType, data.cuisineTypes.length, data.details.title, data.details.description, router]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
            <CreateEventHeader />

            <KeyboardAwareScrollView
                enableOnAndroid={true}
                extraScrollHeight={40}
                extraHeight={120}
                enableResetScrollToCoords={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingHorizontal: horizontalPadding, paddingBottom: 120, paddingTop: 0 }}
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
            >
                    <WizardProgress currentStep={0} />

                    <View className="mt-6 mb-6">
                        <SelectionSection
                            title="Qual o tipo de seu evento?"
                            items={EVENT_TYPES}
                            selectedItems={data.eventType}
                            onSelect={setEventType}
                            variant="grid"
                        />
                    </View>

                    <View className="mb-6">
                        <SelectionSection
                            title="Que tipo de comida será servida?"
                            subtitle="Selecione pelo menos uma"
                            items={CUISINE_TYPES}
                            selectedItems={data.cuisineTypes}
                            onSelect={toggleCuisineType}
                            isMultiSelect
                            variant="pill"
                        />
                    </View>

                    <View className="mb-4">
                        <Text className="text-lg font-bold mb-4 text-[#333333]">Fale sobre o seu evento</Text>

                        <View className="border border-gray-200 rounded-2xl bg-white mb-4" style={{ padding: isSmallScreen ? 12 : 16 }}>
                            <Text className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wider">Título do evento</Text>
                            <TextInput
                                className="text-base text-[#333333] font-medium"
                                placeholder="Ex: Jantar das arábias na casa da Ju"
                                placeholderTextColor="#D1D5DB"
                                value={data.details.title}
                                onChangeText={(text) => updateDetails({ title: text })}
                            />
                        </View>

                        <View className="border border-gray-200 rounded-2xl bg-white" style={{ padding: isSmallScreen ? 12 : 16, minHeight: isSmallScreen ? 100 : 120 }}>
                            <Text className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wider">Descrição do evento</Text>
                            <TextInput
                                className="text-sm text-[#333333] leading-5"
                                placeholder="Dica: Seja amigável e convidativo: conte as razões que levaram você a querer receber pessoas..."
                                placeholderTextColor="#D1D5DB"
                                value={data.details.description}
                                onChangeText={(text) => updateDetails({ description: text })}
                                multiline
                                textAlignVertical="top"
                            />
                        </View>
                    </View>
            </KeyboardAwareScrollView>

            <View
                className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100"
                style={{
                    paddingBottom: Math.max(insets.bottom, 16),
                    paddingHorizontal: horizontalPadding,
                    paddingTop: 14,
                }}
            >
                <TouchableOpacity
                    className={`h-[52px] rounded-2xl items-center justify-center ${!canProceed ? 'bg-orange-200' : 'bg-[#FF8C42]'}`}
                    onPress={handleNext}
                    activeOpacity={canProceed ? 0.8 : 1}
                    disabled={!canProceed}
                    style={canProceed ? {
                        shadowColor: '#FF8C42',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.25,
                        shadowRadius: 8,
                        elevation: 4,
                    } : undefined}
                >
                    <Text className="text-[16px] font-bold text-white">
                        Salvar e prosseguir
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
