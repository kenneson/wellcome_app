import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { WizardProgress } from '@/components/event-creation/WizardProgress';
import { SelectionCard } from '@/components/event-creation/SelectionCard';
import { useEventCreation } from '@/context/EventCreationContext';
import { IconSymbol } from '@/components/ui/icon-symbol';

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

    const handleNext = () => {
        if (!data.location.address.trim()) {
            Alert.alert('Atenção', 'Informe o endereço do local.');
            return;
        }
        router.push('/events/create/details');
    };

    const handleBack = () => router.back();

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
                    Seu endereço completo só será mostrado aos convidados após o pagamento da taxa de reserva
                </Text>

                <TextInput
                    style={styles.addressInput}
                    placeholder="Endereço completo"
                    value={data.location.address}
                    onChangeText={(text) => updateLocation({ address: text })}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                />

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
    addressInput: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        minHeight: 80,
        backgroundColor: '#FAFAFA' // Slightly distinct background for address area?
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
