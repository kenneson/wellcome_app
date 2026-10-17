import { CreateEventHeader } from '@/components/ui/CreateEventHeader';
import { BrandSheet, WellcomeBottomBar, WellcomeButton, WellcomeField } from '@/components/ui/wellcome';
import { LocationAutocomplete } from '@/components/ui/LocationAutocomplete';
import { LocationMap } from '@/components/ui/LocationMap';
import { SelectionSection } from '@/components/ui/SelectionSection';
import { WizardProgress } from '@/components/ui/WizardProgress';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { validateEventStep } from '@/features/create-event/model/eventCreationValidation';
import { locationService } from '@/services/api/LocationService';
import { useEventCreation } from '@/shared/context/EventCreationContext';
import { Palette, Spacing } from '@/shared/constants/theme';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

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
        <View style={styles.screen}>
            <CreateEventHeader saveStatus={saveStatus} />
            <BrandSheet>
            <KeyboardAwareScrollView
                contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
                keyboardShouldPersistTaps="handled"
                style={styles.flex}
            >
                <WizardProgress currentStep={2} />
                <Text style={styles.title}>Onde será o evento?</Text>
                <Text style={styles.subtitle}>O endereço exato só será liberado para participantes autorizados.</Text>

                <View style={styles.gpsButton}>
                    <WellcomeButton
                        label="Usar localização atual"
                        icon="location.fill"
                        variant="secondary"
                        loading={loadingGPS}
                        onPress={() => void handleUseGPS()}
                    />
                </View>

                <View style={styles.searchButton}>
                    <WellcomeButton
                        label="Buscar endereço"
                        icon="search"
                        variant="outline"
                        onPress={() => setShowSearchModal(true)}
                    />
                </View>

                <WellcomeField label="Endereço completo" error={!data.location.address && error ? error : undefined}>
                    <TextInput
                        style={[styles.input, styles.addressInput]}
                        placeholder="Busque um endereço ou use o GPS"
                        placeholderTextColor={Palette.subtle}
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
                    <View style={styles.row}>
                        <WellcomeField label="Cidade" className="flex-1">
                            <TextInput
                                style={styles.input}
                                placeholder="Cidade"
                                placeholderTextColor={Palette.subtle}
                                value={data.location.city}
                                onChangeText={(city) => updateLocation({ city, confirmed: false })}
                                autoCapitalize="words"
                            />
                        </WellcomeField>
                        <WellcomeField label="Estado" className="w-[34%]">
                            <TextInput
                                style={[styles.input, styles.uppercase]}
                                placeholder="UF"
                                placeholderTextColor={Palette.subtle}
                                value={data.location.state}
                                onChangeText={(state) => updateLocation({ state: state.toUpperCase().slice(0, 2), confirmed: false })}
                                autoCapitalize="characters"
                                maxLength={2}
                            />
                        </WellcomeField>
                    </View>
                ) : null}

                {data.location.latitude !== null && data.location.longitude !== null ? (
                    <View style={styles.map}>
                        <LocationMap
                            latitude={data.location.latitude}
                            longitude={data.location.longitude}
                            confirmed={data.location.confirmed}
                            onConfirm={(coordinates) => updateLocation({ ...coordinates, confirmed: true })}
                        />
                    </View>
                ) : null}

                {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}

                <View style={styles.section}>
                    <SelectionSection title="Facilidades do local" items={FACILITIES} selectedItems={data.location.facilities} onSelect={(item) => toggleListValue('facilities', item)} isMultiSelect variant="pill" />
                </View>
                <View style={styles.section}>
                    <SelectionSection title="Regras do local" items={RULES} selectedItems={data.location.rules} onSelect={(item) => toggleListValue('rules', item)} isMultiSelect variant="pill" />
                </View>
            </KeyboardAwareScrollView>
            </BrandSheet>

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
    gpsButton: {
        marginBottom: Spacing.md,
    },
    searchButton: {
        marginBottom: Spacing.xl,
    },
    input: {
        minHeight: 48,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        fontSize: 15,
        color: Palette.ink,
    },
    addressInput: {
        minHeight: 76,
    },
    uppercase: {
        textTransform: 'uppercase',
    },
    row: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    map: {
        marginBottom: Spacing.xl,
    },
    error: {
        fontSize: 14,
        lineHeight: 20,
        color: Palette.danger,
        marginBottom: Spacing.lg,
    },
    section: {
        marginBottom: Spacing.xxl,
    },
});
