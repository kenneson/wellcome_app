import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { WizardProgress } from '@/shared/ui/event-creation/WizardProgress';
import { SelectionCard } from '@/shared/ui/event-creation/SelectionCard';
import { useEventCreation } from '@/shared/context/EventCreationContext';
import { IconSymbol } from '@/shared/ui/ui/icon-symbol';

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

    const handleNext = () => {
        if (!data.location.address.trim()) {
            Alert.alert('Atenção', 'Informe o endereço do local.');
            return;
        }
        if (!data.location.latitude || !data.location.longitude) {
            Alert.alert(
                'Localização incompleta',
                'Precisamos das coordenadas exatas. Por favor, use o botão "Usar minha localização atual" ou verifique o endereço.',
                [
                    { text: 'Tentar GPS', onPress: handleUseGPS },
                    { text: 'Continuar mesmo assim (não recomendado)', onPress: () => router.push('/events/create/details'), style: 'cancel' }
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
            if (status !== 'granted') {
                Alert.alert('Permissão negada', 'Precisamos de acesso ao GPS para pegar o endereço exato.');
                return;
            }

            let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            const { latitude, longitude } = location.coords;

            // Web doesn't support built-in reverse geocoding in Expo SDK 50+
            if (Platform.OS === 'web') {
                updateLocation({
                    latitude: latitude,
                    longitude: longitude
                });
                Alert.alert('Sucesso', 'Coordenadas capturadas! Na versão Web, por favor digite o endereço manualmente.');
                return;
            }

            // Reverse Geocode to get address text (Native only)
            let addressResponse = await Location.reverseGeocodeAsync({ latitude, longitude });

            if (addressResponse && addressResponse.length > 0) {
                const addr = addressResponse[0];
                const fullAddress = `${addr.street || ''}, ${addr.streetNumber || ''} - ${addr.district || ''}, ${addr.city || ''} - ${addr.region || ''}`;

                updateLocation({
                    address: fullAddress,
                    latitude: latitude,
                    longitude: longitude
                });
            } else {
                updateLocation({
                    latitude: latitude,
                    longitude: longitude
                });
                Alert.alert('Coordenadas capturadas', 'Não conseguimos achar o endereço escrito, favor preencher manualmente, mas a localização GPS já foi salva!');
            }

        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Falha ao pegar localização GPS.');
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
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <IconSymbol name="chevron.left" size={24} color="#000" />
                    <Text style={styles.backText}>Voltar</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Crie seu evento</Text>
                <View style={{ width: 60 }} />
            </View>

            <WizardProgress currentStep={2} />

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.sectionTitle}>Informações sobre o local</Text>
                <Text style={styles.description}>
                    A localização exata é importante para convidados num raio de 60km te encontrarem.
                </Text>

                <TouchableOpacity
                    style={styles.gpsButton}
                    onPress={handleUseGPS}
                    disabled={loadingGPS}
                >
                    {loadingGPS ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                            <IconSymbol name="location.fill" size={20} color="#FFF" />
                            <Text style={styles.gpsButtonText}>Usar minha localização atual</Text>
                        </>
                    )}
                </TouchableOpacity>

                <TextInput
                    style={styles.addressInput}
                    placeholder="Endereço completo (Rua, Número, Bairro, Cidade)"
                    value={data.location.address}
                    onChangeText={(text) => updateLocation({ address: text })}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                />

                {data.location.latitude && (
                    <Text style={styles.coordenadasText}>
                        ✅ Coordenadas salvas: {data.location.latitude.toFixed(4)}, {data.location.longitude?.toFixed(4)}
                    </Text>
                )}

                <View style={styles.divider} />

                <Text style={styles.sectionTitle}>Selecione as facilidades do local</Text>
                <View style={styles.grid}>
                    {FACILITIES.map((item) => (
                        <SelectionCard
                            key={item}
                            label={item}
                            selected={data.location.facilities.includes(item)}
                            onPress={() => toggleFacility(item)}
                            style={styles.card}
                        />
                    ))}
                </View>

                <View style={styles.divider} />

                <Text style={styles.sectionTitle}>Selecione as regras do seu local</Text>
                <View style={styles.grid}>
                    {RULES.map((item) => (
                        <SelectionCard
                            key={item}
                            label={item}
                            selected={data.location.rules.includes(item)}
                            onPress={() => toggleRule(item)}
                            style={styles.card}
                        />
                    ))}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                    <Text style={styles.nextButtonText}>Salvar e prosseguir</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 60,
    },
    backText: {
        fontSize: 16,
        marginLeft: 4,
        color: '#000',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    content: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    description: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
    },
    gpsButton: {
        flexDirection: 'row',
        backgroundColor: '#4A90E2',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        gap: 8
    },
    gpsButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14
    },
    addressInput: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        minHeight: 80,
        backgroundColor: '#FAFAFA'
    },
    coordenadasText: {
        fontSize: 12,
        color: 'green',
        marginTop: 4,
        fontWeight: '600'
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
    },
    card: {
        // Override default card styles if needed
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: 24,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        backgroundColor: '#fff',
    },
    nextButton: {
        backgroundColor: '#FF8C42',
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    nextButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
