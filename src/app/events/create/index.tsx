import { CreateEventHeader } from '@/components/ui/CreateEventHeader';
import { WellcomeBottomBar, WellcomeButton } from '@/components/ui/wellcome';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { SelectionPill } from '@/components/ui/SelectionPill';
import { SelectionSection } from '@/components/ui/SelectionSection';
import { WizardProgress } from '@/components/ui/WizardProgress';
import { validateEventStep } from '@/features/create-event/model/eventCreationValidation';
import { useEventDetailsViewModel } from '@/features/events/create/useEventDetailsViewModel';
import { useEventCreation } from '@/shared/context/EventCreationContext';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const EVENT_TYPES = ['Café da manhã', 'Brunch', 'Almoço', 'Lanche', 'Jantar', 'Degustação', 'Pic-nic', 'Coquetel', 'Outro'] as const;
const CUISINE_TYPES = [
    'Africana', 'Alemã', 'Asiática', 'Árabe', 'Argentina', 'Baiana', 'Brasileira', 'Carnes',
    'Café colonial', 'Chinesa', 'Colombiana', 'Contemporânea', 'Coreana', 'Crepes',
    'Doces e bolos', 'Espanhola', 'Francesa', 'Frutos do mar', 'Gaúcha', 'Grega',
    'Hambúrguer', 'Indiana', 'Italiana', 'Japonesa', 'Lanches', 'Mexicana', 'Mineira',
    'Mediterrânea', 'Nordestina', 'Pastéis', 'Peruana', 'Pizza', 'Portuguesa',
    'Sopas e caldos', 'Tailandesa', 'Variada', 'Vegana', 'Vegetariana',
] as const;

export default function EventCreateEssentials() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const horizontalPadding = width < 375 ? 16 : width >= 414 ? 24 : 20;
    const creation = useEventCreation();
    const reducedMotion = useReducedMotion();
    const { setCurrentStep } = creation;
    const details = useEventDetailsViewModel();
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showCuisines, setShowCuisines] = useState(false);
    const [cuisineSearch, setCuisineSearch] = useState('');
    const titleRef = useRef<TextInput>(null);
    const descriptionRef = useRef<TextInput>(null);

    useEffect(() => setCurrentStep(0), [setCurrentStep]);

    const filteredCuisines = useMemo(() => {
        const search = cuisineSearch.trim().toLocaleLowerCase('pt-BR');
        return search ? CUISINE_TYPES.filter((item) => item.toLocaleLowerCase('pt-BR').includes(search)) : CUISINE_TYPES;
    }, [cuisineSearch]);

    const handleNext = async () => {
        const nextErrors = validateEventStep(creation.data, 0);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            requestAnimationFrame(() => {
                if (nextErrors.title) titleRef.current?.focus();
                else if (nextErrors.description) descriptionRef.current?.focus();
            });
            return;
        }
        await creation.flushDraft();
        router.push('/events/create/menu');
    };

    const handleExit = () => Alert.alert('Sair da criação?', 'Seu rascunho está salvo e poderá ser retomado em Meus eventos.', [
        { text: 'Continuar editando', style: 'cancel' },
        { text: 'Sair', onPress: () => router.replace('/(tabs)') },
        {
            text: 'Excluir rascunho',
            style: 'destructive',
            onPress: () => void creation.discardDraft().then(() => router.replace('/(tabs)')),
        },
    ]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }} edges={['top', 'bottom']}>
            <CreateEventHeader onBack={handleExit} onDiscard={handleExit} saveStatus={creation.saveStatus} />
            <KeyboardAwareScrollView
                contentContainerStyle={{ paddingHorizontal: horizontalPadding, paddingBottom: 120 }}
                keyboardShouldPersistTaps="handled"
                style={{ flex: 1 }}
            >
                <WizardProgress currentStep={0} />
                <Text className="text-2xl font-extrabold text-[#1A1A1A] mt-3">Comece pela experiência</Text>
                <Text className="text-sm text-gray-500 mt-1 mb-5">Uma boa apresentação ajuda as pessoas a entenderem o que torna seu evento especial.</Text>

                <TouchableOpacity
                    onPress={details.pickImage}
                    className={`w-full overflow-hidden bg-gray-50 border mb-2 ${errors.coverImageUrl ? 'border-red-400' : 'border-gray-200'}`}
                    style={{ height: width < 375 ? 165 : 200, borderRadius: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={creation.data.details.coverImage ? 'Alterar foto de capa' : 'Adicionar foto de capa'}
                >
                    {creation.data.details.coverImage ? (
                        <>
                            <Image source={{ uri: creation.data.details.coverImage }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                            <View className="absolute bottom-3 right-3 bg-black/70 flex-row items-center px-3 py-2" style={{ borderRadius: 8 }}>
                                <Ionicons name="camera" size={16} color="#FFF" />
                                <Text className="text-white text-xs font-bold ml-2">Alterar</Text>
                            </View>
                        </>
                    ) : (
                        <View className="flex-1 items-center justify-center px-6">
                            <Ionicons name="camera-outline" size={30} color="#73787E" />
                            <Text className="text-base text-gray-700 font-bold mt-2">Adicionar foto de capa</Text>
                            <Text className="text-xs text-gray-500 mt-1">Imagem horizontal em 16:9</Text>
                        </View>
                    )}
                </TouchableOpacity>
                {errors.coverImageUrl && <Text className="text-xs text-red-600 mb-4">{errors.coverImageUrl}</Text>}

                <Field label="Título do evento" error={errors.title} count={`${creation.data.details.title.length}/80`}>
                    <TextInput
                        ref={titleRef}
                        className="text-base text-[#1A1A1A] p-4"
                        placeholder="Ex: Jantar árabe na casa da Ju"
                        placeholderTextColor="#9CA3AF"
                        value={creation.data.details.title}
                        maxLength={80}
                        onChangeText={(title) => creation.updateDetails({ title })}
                    />
                </Field>

                <Field label="Descrição" error={errors.description} count={`${creation.data.details.description.length}/1500`}>
                    <TextInput
                        ref={descriptionRef}
                        className="text-base text-[#1A1A1A] p-4"
                        style={{ minHeight: 125 }}
                        placeholder="Conte o menu, a proposta da noite e o que os convidados podem esperar."
                        placeholderTextColor="#9CA3AF"
                        value={creation.data.details.description}
                        maxLength={1500}
                        onChangeText={(description) => creation.updateDetails({ description })}
                        multiline
                        textAlignVertical="top"
                    />
                </Field>

                <View className="mt-2 mb-6">
                    <SelectionSection title="Tipo de evento" items={EVENT_TYPES} selectedItems={creation.data.eventType} onSelect={creation.setEventType} variant="grid" />
                    {errors.eventType && <Text className="text-xs text-red-600 mt-1">{errors.eventType}</Text>}
                </View>

                <Text className="text-lg font-bold text-[#1A1A1A]">Culinárias</Text>
                <Text className="text-sm text-gray-500 mt-1 mb-3">Escolha até cinco opções.</Text>
                <View className="flex-row flex-wrap gap-2 mb-3">
                    {creation.data.cuisineTypes.map((item) => <SelectionPill key={item} label={item} selected onPress={() => creation.toggleCuisineType(item)} />)}
                </View>
                <TouchableOpacity
                    className="flex-row items-center justify-center border border-gray-300 py-3 mb-2"
                    style={{ borderRadius: 8 }}
                    onPress={() => setShowCuisines(true)}
                >
                    <Ionicons name="search" size={18} color="#C45D22" />
                    <Text className="text-[#C45D22] font-bold ml-2">Buscar culinárias</Text>
                </TouchableOpacity>
                {errors.cuisineTypes && <Text className="text-xs text-red-600">{errors.cuisineTypes}</Text>}
            </KeyboardAwareScrollView>

            <WellcomeBottomBar>
                <WellcomeButton label="Continuar" onPress={() => void handleNext()} />
            </WellcomeBottomBar>
            <Modal visible={showCuisines} animationType={reducedMotion ? 'none' : 'slide'} onRequestClose={() => setShowCuisines(false)}>
                <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }}>
                    <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
                        <TouchableOpacity className="w-11 h-11 items-center justify-center" onPress={() => setShowCuisines(false)} accessibilityLabel="Fechar">
                            <Ionicons name="close" size={24} color="#202124" />
                        </TouchableOpacity>
                        <Text className="flex-1 text-center text-lg font-bold">Escolha as culinárias</Text>
                        <Text className="w-11 text-center text-sm font-bold text-[#C45D22]">{creation.data.cuisineTypes.length}/5</Text>
                    </View>
                    <View className="mx-5 mt-4 flex-row items-center bg-gray-100 px-4" style={{ borderRadius: 8 }}>
                        <Ionicons name="search" size={20} color="#73787E" />
                        <TextInput className="flex-1 py-3 ml-2 text-base" placeholder="Buscar" value={cuisineSearch} onChangeText={setCuisineSearch} autoFocus />
                    </View>
                    <KeyboardAwareScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
                        <View className="flex-row flex-wrap gap-2">
                            {filteredCuisines.map((item) => <SelectionPill key={item} label={item} selected={creation.data.cuisineTypes.includes(item)} onPress={() => creation.toggleCuisineType(item)} />)}
                        </View>
                    </KeyboardAwareScrollView>
                    <View className="p-5 border-t border-gray-100">
                        <TouchableOpacity className="h-[50px] bg-[#1A1A1A] items-center justify-center" style={{ borderRadius: 8 }} onPress={() => setShowCuisines(false)}>
                            <Text className="text-white font-bold">Concluir</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

function Field({ label, error, count, children }: { label: string; error?: string; count: string; children: React.ReactNode }) {
    return (
        <View className="mb-4">
            <View className="flex-row justify-between mb-2">
                <Text className="text-xs text-gray-600 font-bold uppercase">{label}</Text>
                <Text className="text-xs text-gray-400">{count}</Text>
            </View>
            <View className={`border bg-white ${error ? 'border-red-400' : 'border-gray-200'}`} style={{ borderRadius: 8 }}>{children}</View>
            {error && <Text className="text-xs text-red-600 mt-1" accessibilityRole="alert">{error}</Text>}
        </View>
    );
}
