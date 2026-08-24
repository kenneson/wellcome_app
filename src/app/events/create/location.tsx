import { CreateEventHeader } from '@/components/ui/CreateEventHeader';
import { WellcomeBottomBar, WellcomeButton, WellcomeField } from '@/components/ui/wellcome';
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
import { Alert, Linking, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const FACILITIES = [
    'Estacionamento para visitantes', 'Edifício com elevador', 'Ar condicionado',
    'Próximo a pontos de ônibus ou metrô', 'Estacionamento rotativo próximo',
    'Espaço para fumantes', 'Segurança privada', 'Rampas de acessibilidade',
];
const RULES = ['Não é permitido fumar', 'Barulho moderado', 'Não indicado para crianças', 'Não aceita animais'];

export default function EventCreateLocation() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const horizontalPadding = width < 375 ? 16 : width >= 414 ? 24 : 20;
    const { data, updateLocation, setCurrentStep, flushDraft, saveStatus } = useEventCreation();
    const [loadingGPS, setLoadingGPS] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => setCurrentStep(2), [setCurrentStep]);

    const applyAddress = (
        result: Awaited<ReturnType<typeof locationService.reverseGeocode>>,
        complete = true,
    ) => {
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
        setError(complete
            ? ''
            : 'Endereço localizado. Complete cidade e estado abaixo antes de continuar.');
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
            if (errors.location) setShowSearchModal(true);
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

                <View className="mb-4">
                    <WellcomeButton
                        label="Usar localização atual"
                        icon="location.fill"
                        variant="secondary"
                        loading={loadingGPS}
                        onPress={() => void handleUseGPS()}
                    />
                </View>

                <View className="mb-5">
                    <WellcomeButton
                        label="Buscar endereço"
                        icon="search"
                        variant="outline"
                        onPress={() => setShowSearchModal(true)}
                    />
                </View>

                <WellcomeField label="Endereço completo" error={!data.location.address && error ? error : undefined}>
                    <TextInput
                        className="min-h-[76px] px-4 py-3 text-base text-[#1A1A1A]"
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
                        textAlignVertical="top"
                    />
                </WellcomeField>

                {data.location.address ? (
                    <View className="flex-row gap-3">
                        <WellcomeField label="Cidade" className="flex-1">
                            <TextInput
                                className="min-h-12 px-4 py-3 text-base text-[#1A1A1A]"
                                placeholder="Cidade"
                                placeholderTextColor="#9CA3AF"
                                value={data.location.city}
                                onChangeText={(city) => updateLocation({ city, confirmed: false })}
                                autoCapitalize="words"
                            />
                        </WellcomeField>
                        <WellcomeField label="Estado" className="w-[34%]">
                            <TextInput
                                className="min-h-12 px-4 py-3 text-base uppercase text-[#1A1A1A]"
                                placeholder="UF"
                                placeholderTextColor="#9CA3AF"
                                value={data.location.state}
                                onChangeText={(state) => updateLocation({ state: state.toUpperCase().slice(0, 2), confirmed: false })}
                                autoCapitalize="characters"
                                maxLength={2}
                            />
                        </WellcomeField>
                    </View>
                ) : null}

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

            <WellcomeBottomBar>
                <WellcomeButton label="Continuar" onPress={() => void handleNext()} />
            </WellcomeBottomBar>

            <LocationAutocomplete
                visible={showSearchModal}
                value={data.location.address}
                onClose={() => setShowSearchModal(false)}
                onSelectAddress={applyAddress}
                allowIncompleteAddress
                type="address"
                asModal
                placeholder="Rua, número, bairro ou local"
            />
        </SafeAreaView>
    );
}
