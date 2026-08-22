import { CreateEventHeader } from '@/components/ui/CreateEventHeader';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LocationAutocomplete } from '@/components/ui/LocationAutocomplete';
import { LocationMap } from '@/components/ui/LocationMap';
import { SelectionSection } from '@/components/ui/SelectionSection';
import { WizardProgress } from '@/components/ui/WizardProgress';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { validateEventStep } from '@/features/create-event/model/eventCreationValidation';
import { locationService } from '@/services/api/LocationService';
import { useEventCreation } from '@/shared/context/EventCreationContext';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const FACILITIES = [
    'Estacionamento para visitantes', 'Edifício com elevador', 'Ar condicionado',
    'Próximo a pontos de ônibus ou metrô', 'Estacionamento rotativo próximo',
    'Espaço para fumantes', 'Segurança privada', 'Rampas de acessibilidade',
];
const RULES = ['Não é permitido fumar', 'Barulho moderado', 'Não indicado para crianças', 'Não aceita animais'];

export default function EventCreateLocation() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const horizontalPadding = width < 375 ? 16 : width >= 414 ? 24 : 20;
    const { data, updateLocation, setCurrentStep, flushDraft, saveStatus } = useEventCreation();
    const [loadingGPS, setLoadingGPS] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => setCurrentStep(2), [setCurrentStep]);

    const applyAddress = (result: Awaited<ReturnType<typeof locationService.reverseGeocode>>) => {
        updateLocation({
            address: result.displayName,
            city: result.city,
            state: result.stateCode || result.state,
            neighborhood: result.neighborhood,
            postalCode: result.postalCode,
            latitude: result.lat,
            longitude: result.lon,
            confirmed: false,
        });
        setError('');
    };

    const handleUseGPS = async () => {
        setLoadingGPS(true);
        setError('');
        try {
            const permission = await Location.requestForegroundPermissionsAsync();
            if (permission.status !== 'granted') {
                Alert.alert('Localização desativada', 'Autorize o acesso à localização nos ajustes do aparelho.', [
                    { text: 'Agora não', style: 'cancel' },
                    { text: 'Abrir ajustes', onPress: () => void Linking.openSettings() },
                ]);
                return;
            }
            const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            applyAddress(await locationService.reverseGeocode(current.coords.latitude, current.coords.longitude));
        } catch (locationError: any) {
            setError(locationError?.message || 'Não foi possível obter sua localização');
        } finally {
            setLoadingGPS(false);
        }
    };

    const handleNext = async () => {
        const errors = validateEventStep(data, 2);
        if (Object.keys(errors).length > 0) {
            setError(Object.values(errors)[0]);
            if (errors.location || errors.city) setShowSearchModal(true);
            return;
        }
        await flushDraft();
        router.push('/events/create/details');
    };

    const toggleListValue = (key: 'facilities' | 'rules', item: string) => {
        const current = data.location[key];
        updateLocation({ [key]: current.includes(item) ? current.filter((value) => value !== item) : [...current, item] });
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }} edges={['top', 'bottom']}>
            <CreateEventHeader saveStatus={saveStatus} />
            <KeyboardAwareScrollView
                contentContainerStyle={{ paddingHorizontal: horizontalPadding, paddingBottom: 120 }}
                keyboardShouldPersistTaps="handled"
                style={{ flex: 1 }}
            >
                <WizardProgress currentStep={2} />
                <Text className="text-2xl font-extrabold text-[#1A1A1A] mt-3">Onde será o evento?</Text>
                <Text className="text-sm text-gray-500 mt-1 mb-5">O endereço exato só será liberado para participantes autorizados.</Text>

                <TouchableOpacity
                    className="flex-row bg-[#315E9E] items-center justify-center mb-4 gap-2 py-4"
                    style={{ borderRadius: 8 }}
                    onPress={handleUseGPS}
                    disabled={loadingGPS}
                    accessibilityRole="button"
                    accessibilityLabel="Usar minha localização atual"
                >
                    {loadingGPS ? <ActivityIndicator color="#FFF" /> : <>
                        <IconSymbol name="location.fill" size={20} color="#FFF" />
                        <Text className="text-white font-bold text-base">Usar localização atual</Text>
                    </>}
                </TouchableOpacity>

                <TouchableOpacity
                    className="flex-row items-center justify-center border border-orange-300 bg-orange-50 mb-5 py-4"
                    style={{ borderRadius: 8 }}
                    onPress={() => setShowSearchModal(true)}
                    accessibilityRole="button"
                >
                    <IconSymbol name="magnifyingglass" size={20} color="#C45D22" />
                    <Text className="text-[#C45D22] font-bold text-base ml-2">Buscar endereço</Text>
                </TouchableOpacity>

                <Text className="text-xs text-gray-600 mb-2 font-bold">ENDEREÇO COMPLETO</Text>
                <TextInput
                    className="border border-gray-200 bg-gray-50 text-base text-[#1A1A1A] p-4 mb-4"
                    style={{ borderRadius: 8, minHeight: 78 }}
                    placeholder="Busque um endereço ou use o GPS"
                    placeholderTextColor="#9CA3AF"
                    value={data.location.address}
                    onChangeText={(address) => updateLocation({
                        address,
                        city: '',
                        state: '',
                        latitude: null,
                        longitude: null,
                        confirmed: false,
                    })}
                    multiline
                />

                {data.location.latitude !== null && data.location.longitude !== null ? (
                    <View className="mb-5">
                        <LocationMap
                            latitude={data.location.latitude}
                            longitude={data.location.longitude}
                            confirmed={data.location.confirmed}
                            onConfirm={(coordinates) => updateLocation({ ...coordinates, confirmed: true })}
                        />
                    </View>
                ) : null}

                {!!error && <Text className="text-sm text-red-600 mb-4" accessibilityRole="alert">{error}</Text>}

                <View className="mb-6">
                    <SelectionSection title="Facilidades do local" items={FACILITIES} selectedItems={data.location.facilities} onSelect={(item) => toggleListValue('facilities', item)} isMultiSelect variant="pill" />
                </View>
                <View className="mb-6">
                    <SelectionSection title="Regras do local" items={RULES} selectedItems={data.location.rules} onSelect={(item) => toggleListValue('rules', item)} isMultiSelect variant="pill" />
                </View>
            </KeyboardAwareScrollView>

            <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100" style={{ paddingBottom: Math.max(insets.bottom, 16), paddingHorizontal: horizontalPadding, paddingTop: 12 }}>
                <TouchableOpacity className="h-[52px] bg-[#FF8C42] items-center justify-center" style={{ borderRadius: 8 }} onPress={() => void handleNext()}>
                    <Text className="text-white text-base font-bold">Continuar</Text>
                </TouchableOpacity>
            </View>

            <LocationAutocomplete
                visible={showSearchModal}
                value={data.location.address}
                onClose={() => setShowSearchModal(false)}
                onSelectAddress={applyAddress}
                type="address"
                asModal
                placeholder="Rua, número, bairro ou local"
            />
        </SafeAreaView>
    );
}
