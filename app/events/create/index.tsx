import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { WizardProgress } from '@/components/event-creation/WizardProgress';
import { SelectionCard } from '@/components/event-creation/SelectionCard';
import { useEventCreation } from '@/context/EventCreationContext';
import { IconSymbol } from '@/components/ui/icon-symbol';

const EVENT_TYPES = [
    'Café da manhã', 'Brunch', 'Almoço',
    'Lanche', 'Jantar', 'Degustação',
    'Pic-nic', 'Coquetel', 'Outro'
];

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
];

export default function EventCreateStep1() {
    const router = useRouter();
    const { data, setEventType, toggleCuisineType } = useEventCreation();

    const handleNext = () => {
        if (!data.eventType) {
            // TODO: Show error feedback
            return;
        }
        if (data.cuisineTypes.length === 0) {
            // TODO: Show error feedback
            return;
        }
        router.push('/events/create/menu');
    };

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)');
        }
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

            <WizardProgress currentStep={0} />

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.sectionTitle}>Qual o tipo do seu evento?</Text>
                <View style={styles.grid}>
                    {EVENT_TYPES.map((type) => (
                        <SelectionCard
                            key={type}
                            label={type}
                            selected={data.eventType === type}
                            onPress={() => setEventType(type)}
                            style={styles.card}
                        />
                    ))}
                </View>

                <View style={styles.divider} />

                <Text style={styles.sectionTitle}>Que tipo de comida será servida?</Text>
                <Text style={styles.sectionSubtitle}>Selecione pelo menos uma</Text>
                <View style={styles.grid}>
                    {CUISINE_TYPES.map((type) => (
                        <SelectionCard
                            key={type}
                            label={type}
                            selected={data.cuisineTypes.includes(type)}
                            onPress={() => toggleCuisineType(type)}
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
        marginTop: 10,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    card: {
        flexGrow: 1,
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
