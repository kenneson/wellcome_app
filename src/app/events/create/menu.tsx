import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { WizardProgress } from '@/components/ui/WizardProgress';
import { DishInputCard } from '@/components/ui/DishInputCard';
import { Checkbox } from '@/components/ui/Checkbox';
import { useEventCreation } from '@/shared/context/EventCreationContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { CreateEventHeader } from '@/components/ui/CreateEventHeader';

export default function EventCreateStep2() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isSmallScreen = width < 375;
    const horizontalPadding = isSmallScreen ? 16 : width >= 414 ? 24 : 20;
    const {
        data,
        setServedInSequence,
        addDish,
        updateDish,
        removeDish,
        setVeganOptions,
        setSubstitutions,
        setMenuAlterations
    } = useEventCreation();

    const handleNext = () => {
        if (data.dishes.length === 0) {
            Alert.alert('Atenção', 'Adicione pelo menos um prato ao cardápio.');
            return;
        }
        const invalidDish = data.dishes.find(d => !d.name.trim());
        if (invalidDish) {
            Alert.alert('Atenção', 'Preencha o nome de todos os pratos.');
            return;
        }
        router.push('/events/create/location');
    };

    const handleAddDish = () => {
        addDish({
            id: Math.random().toString(36).substr(2, 9),
            name: '',
            description: '',
            category: ''
        });
    };

    const handleBack = () => router.back();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
            <CreateEventHeader />

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingHorizontal: horizontalPadding, paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View className="mb-6">
                    <Text style={{ fontSize: isSmallScreen ? 24 : 28 }} className="font-extrabold text-[#1A1A1A] mb-2 leading-tight">
                        O que será{'\n'}servido?
                    </Text>
                    <Text className="text-sm text-gray-400">
                        Detalhe o cardápio da experiência.
                    </Text>
                </View>

                <View className="mb-6">
                    <WizardProgress currentStep={1} />
                </View>

                <View className="bg-gray-50 rounded-2xl mb-6" style={{ padding: isSmallScreen ? 14 : 20 }}>
                    <Checkbox
                        label="Serviço em sequência (Entrada, Prato Principal...)"
                        checked={data.isServedInSequence}
                        onChange={setServedInSequence}
                    />
                </View>

                <View className="gap-3 mb-6">
                    {data.dishes.map((dish, index) => (
                        <DishInputCard
                            key={dish.id}
                            index={index}
                            dish={dish}
                            onUpdate={(updates) => updateDish(dish.id, { ...dish, ...updates })}
                            onRemove={() => removeDish(dish.id)}
                        />
                    ))}
                </View>

                <TouchableOpacity
                    className="flex-row items-center justify-center border border-dashed border-orange-300 rounded-2xl bg-orange-50 mb-6"
                    style={{ paddingVertical: isSmallScreen ? 12 : 16, paddingHorizontal: 16 }}
                    onPress={handleAddDish}
                >
                    <IconSymbol name="plus" size={20} color="#FF8C42" />
                    <Text className="text-[#FF8C42] font-bold ml-2">Adicionar prato</Text>
                </TouchableOpacity>

                <View className="h-[1px] bg-gray-100 mb-6" />

                <Text style={{ fontSize: isSmallScreen ? 18 : 20 }} className="font-bold text-[#1A1A1A] mb-4">Informações importantes</Text>

                <View className="gap-4">
                    <Checkbox
                        label="Opções veganas e vegetarianas disponíveis"
                        checked={data.veganOptions}
                        onChange={setVeganOptions}
                    />
                    <Checkbox
                        label="Aceito adaptações por restrições alimentares"
                        checked={data.substitutions}
                        onChange={setSubstitutions}
                    />
                    <Checkbox
                        label="Cardápio sujeito a alterações de ingredientes"
                        checked={data.menuAlterations}
                        onChange={setMenuAlterations}
                    />
                </View>
            </ScrollView>

            <View
                className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100"
                style={{
                    paddingBottom: Math.max(insets.bottom, 16),
                    paddingHorizontal: horizontalPadding,
                    paddingTop: 14,
                }}
            >
                <TouchableOpacity
                    className="h-[52px] bg-[#FF8C42] rounded-2xl items-center justify-center"
                    onPress={handleNext}
                    activeOpacity={0.8}
                    style={{
                        shadowColor: '#FF8C42',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.25,
                        shadowRadius: 8,
                        elevation: 4,
                    }}
                >
                    <Text className="text-white text-[16px] font-bold">Salvar e prosseguir</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
