import { CreateEventHeader } from '@/components/ui/CreateEventHeader';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LocationAutocomplete } from '@/components/ui/LocationAutocomplete';
import { SelectionSection } from '@/components/ui/SelectionSection';
import { WizardProgress } from '@/components/ui/WizardProgress';
import { useEventCreation } from '@/shared/context/EventCreationContext';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const FACILITIES = [
    'Estacionamento para visitantes',
    'Edifício com elevador',
    'Ar condicionado',
    'Próximo a pontos de ônibus ou metrô',
    'Estacionamento rotativo próximo',
    'Espaço para fumantes',
    'Segurança privada',
    'Rampas de acessibilidade'
];

const RULES = [
    'Não é permitido fumar',
    'Barulho moderado',
    'Não indicado para crianças',
    'Não aceita animais'
];

export default function EventCreateStep3() {
    const router = useRouter();
    const { data, updateLocation } = useEventCreation();
    const [loadingGPS, setLoadingGPS] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isSmallScreen = width < 375;
    const horizontalPadding = isSmallScreen ? 16 : width >= 414 ? 24 : 20;

    const handleSelectAddress = (result: any) => {
        updateLocation({
            address: result.displayName,
            latitude: result.lat,
            longitude: result.lon
        });
        setShowSearchModal(false);
    };

    const handleNext = () => {
        if (!data.location.address.trim()) {
            Alert.alert('Atenção', 'Informe o endereço do local.');
            return;
        }
        if (!data.location.latitude || !data.location.longitude) {
            Alert.alert(
                'Localização incompleta',
                'Precisamos das coordenadas exatas.',
                [
                    { text: 'Tentar GPS', onPress: handleUseGPS },
                    { text: 'Continuar', onPress: () => router.push('/events/create/details'), style: 'cancel' }
                ]
            );
            return;
        }
        router.push('/events/create/details');
    };

    const handleBack = () => router.back();

    const handleUseGPS = async () => {
        setLoadingGPS(true);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            const { latitude, longitude } = location.coords;

            if (Platform.OS === 'web') {
                updateLocation({ latitude, longitude });
                return;
            }

            let addressResponse = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (addressResponse && addressResponse.length > 0) {
                const addr = addressResponse[0];
                const fullAddress = `${addr.street || ''}, ${addr.streetNumber || ''} - ${addr.district || ''}, ${addr.city || ''}`;
                updateLocation({ address: fullAddress, latitude, longitude });
            } else {
                updateLocation({ latitude, longitude });
            }
        } catch (error) {
            // ignore
        } finally {
            setLoadingGPS(false);
        }
    };

    const toggleFacility = (item: string) => {
        const list = data.location.facilities;
        const newList = list.includes(item)
            ? list.filter(i => i !== item)
            : [...list, item];
        updateLocation({ facilities: newList });
    };

    const toggleRule = (item: string) => {
        const list = data.location.rules;
        const newList = list.includes(item)
            ? list.filter(i => i !== item)
            : [...list, item];
        updateLocation({ rules: newList });
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
            <CreateEventHeader />

            <KeyboardAwareScrollView
                enableOnAndroid={true}
                extraScrollHeight={40}
                extraHeight={120}
                enableResetScrollToCoords={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingHorizontal: horizontalPadding, paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
            >
                <View className="mb-6">
                    <Text style={{ fontSize: isSmallScreen ? 24 : 28 }} className="font-extrabold text-[#1A1A1A] mb-2 leading-tight">
                        Onde será{'\n'}o evento?
                    </Text>
                    <Text className="text-sm text-gray-400">
                        A localização exata é importante para os convidados.
                    </Text>
                </View>

                <View className="mb-6">
                    <WizardProgress currentStep={2} />
                </View>

                <TouchableOpacity
                    className="flex-row bg-[#4A90E2] rounded-2xl items-center justify-center mb-6 gap-2"
                    style={{ paddingVertical: isSmallScreen ? 14 : 16, paddingHorizontal: 16 }}
                    onPress={handleUseGPS}
                    disabled={loadingGPS}
                >
                    {loadingGPS ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                            <IconSymbol name="location.fill" size={20} color="#FFF" />
                            <Text className="text-white font-bold text-base">Usar localização atual</Text>
                        </>
                    )}
                </TouchableOpacity>

                <View className="mb-6">
                    <Text className="text-xs text-gray-500 mb-1.5 font-semibold ml-1 uppercase tracking-wider">Endereço completo</Text>
                    <TextInput
                        className="border border-gray-200 rounded-2xl text-base bg-gray-50 text-[#1A1A1A]"
                        style={{ padding: isSmallScreen ? 12 : 16, minHeight: isSmallScreen ? 80 : 100 }}
                        placeholder="Rua, Número, Bairro, Cidade..."
                        placeholderTextColor="#D1D5DB"
                        value={data.location.address}
                        onChangeText={(text) => updateLocation({ address: text })}
                        multiline
                        textAlignVertical="top"
                    />
                </View>

                <TouchableOpacity
                    className="flex-row items-center justify-center border border-orange-200 rounded-2xl gap-2 bg-orange-50 mb-6"
                    style={{ paddingVertical: isSmallScreen ? 12 : 14, paddingHorizontal: 16 }}
                    onPress={() => setShowSearchModal(true)}
                >
                    <IconSymbol name="magnifyingglass" size={20} color="#FF8C42" />
                    <Text className="text-[#FF8C42] font-bold text-base">Buscar endereço</Text>
                </TouchableOpacity>

                <LocationAutocomplete
                    visible={showSearchModal}
                    onClose={() => setShowSearchModal(false)}
                    onSelectAddress={handleSelectAddress}
                    type="address"
                    asModal={true}
                    placeholder="Busque por rua, número..."
                />

                <View className="mb-6">
                    <SelectionSection
                        title="Selecione as facilidades do local"
                        items={FACILITIES}
                        selectedItems={data.location.facilities}
                        onSelect={toggleFacility}
                        isMultiSelect
                        variant="pill"
                    />
                </View>

                <View className="mb-6">
                    <SelectionSection
                        title="Selecione as regras do seu local"
                        items={RULES}
                        selectedItems={data.location.rules}
                        onSelect={toggleRule}
                        isMultiSelect
                        variant="pill"
                    />
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
