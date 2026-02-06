import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { WizardProgress } from '@/components/ui/WizardProgress';
import { SelectionCard } from '@/components/ui/SelectionCard';
import { useEventCreation } from '@/shared/context/EventCreationContext';
import { IconSymbol } from '@/components/ui/icon-symbol';

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

const VIBES = [
    'Família', 'Networking', 'Espiritual', 'Casual',
    'Romântico', 'Festa', 'Jantar a dois', 'Negócios'
] as const;

// ============================================================================
// Types
// ============================================================================

interface SelectionSectionProps {
    title: string;
    subtitle?: string;
    items: readonly string[];
    selectedItems: string | string[];
    onSelect: (item: string) => void;
    isMultiSelect?: boolean;
}

// ============================================================================
// Sub-components
// ============================================================================

const SelectionSection = React.memo<SelectionSectionProps>(({
    title,
    subtitle,
    items,
    selectedItems,
    onSelect,
    isMultiSelect = false,
}) => {
    const isSelected = useCallback((item: string) => {
        if (isMultiSelect && Array.isArray(selectedItems)) {
            return selectedItems.includes(item);
        }
        return selectedItems === item;
    }, [selectedItems, isMultiSelect]);

    return (
        <>
            <Text style={styles.sectionTitle}>{title}</Text>
            {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
            <View style={styles.grid}>
                {items.map((item) => (
                    <SelectionCard
                        key={item}
                        label={item}
                        selected={isSelected(item)}
                        onPress={() => onSelect(item)}
                        style={styles.card}
                    />
                ))}
            </View>
        </>
    );
});

SelectionSection.displayName = 'SelectionSection';

// ============================================================================
// Main Component
// ============================================================================

export default function EventCreateStep1() {
    const router = useRouter();
    const { data, setEventType, toggleCuisineType, toggleVibe } = useEventCreation();

    // Memoize validation state
    const canProceed = useMemo(() => {
        return data.eventType && data.cuisineTypes.length > 0;
    }, [data.eventType, data.cuisineTypes.length]);

    // Memoize vibe array to prevent unnecessary renders
    const selectedVibes = useMemo(() => data.vibe ?? [], [data.vibe]);

    const handleNext = useCallback(() => {
        if (!data.eventType) {
            Alert.alert('Atenção', 'Selecione o tipo do evento para continuar.');
            return;
        }
        if (data.cuisineTypes.length === 0) {
            Alert.alert('Atenção', 'Selecione pelo menos um tipo de comida.');
            return;
        }
        router.push('/events/create/menu');
    }, [data.eventType, data.cuisineTypes.length, router]);

    const handleBack = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)');
        }
    }, [router]);

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <IconSymbol name="chevron.left" size={24} color="#000" />
                    <Text style={styles.backText}>Voltar</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Crie seu evento</Text>
                <View style={styles.headerSpacer} />
            </View>

            <WizardProgress currentStep={0} />

            {/* Content */}
            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <SelectionSection
                    title="Qual o tipo do seu evento?"
                    items={EVENT_TYPES}
                    selectedItems={data.eventType}
                    onSelect={setEventType}
                />

                <View style={styles.divider} />

                <SelectionSection
                    title="Que tipo de comida será servida?"
                    subtitle="Selecione pelo menos uma"
                    items={CUISINE_TYPES}
                    selectedItems={data.cuisineTypes}
                    onSelect={toggleCuisineType}
                    isMultiSelect
                />

                <View style={styles.divider} />

                <SelectionSection
                    title="Qual a vibe do evento?"
                    subtitle="Selecione as que combinam"
                    items={VIBES}
                    selectedItems={selectedVibes}
                    onSelect={toggleVibe}
                    isMultiSelect
                />

                <View style={styles.bottomSpacer} />
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.nextButton, !canProceed && styles.nextButtonDisabled]}
                    onPress={handleNext}
                    activeOpacity={canProceed ? 0.8 : 1}
                >
                    <Text style={styles.nextButtonText}>Salvar e prosseguir</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
    },
    // Header
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
        color: '#000',
    },
    headerSpacer: {
        width: 60,
    },
    // Content
    content: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
        marginTop: 10,
        color: '#000',
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
    bottomSpacer: {
        height: 100,
    },
    // Footer
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
    nextButtonDisabled: {
        opacity: 0.6,
    },
    nextButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
