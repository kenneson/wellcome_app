import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { WizardProgress } from '@/components/event-creation/WizardProgress';
import { DishInputCard } from '@/components/event-creation/DishInputCard';
import { Checkbox } from '@/components/ui/Checkbox';
import { useEventCreation } from '@/context/EventCreationContext';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function EventCreateStep2() {
    const router = useRouter();
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
        // Basic validation: at least one dish?
        if (data.dishes.length === 0) {
            Alert.alert('Atenção', 'Adicione pelo menos um prato ao cardápio.');
            return;
        }
        // Check if dishes have content
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
            description: ''
        });
    };

    const handleBack = () => router.back();

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

            <WizardProgress currentStep={1} />

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.sectionTitle}>Adicione os pratos que serão servidos</Text>

                <Checkbox
                    label="Os pratos serão servidos em uma sequência"
                    checked={data.isServedInSequence}
                    onChange={setServedInSequence}
                    style={styles.checkbox}
                />

                {data.dishes.map((dish, index) => (
                    <DishInputCard
                        key={dish.id}
                        index={index}
                        dish={dish}
                        onUpdate={(updates) => updateDish(dish.id, { ...dish, ...updates })}
                        onRemove={() => removeDish(dish.id)}
                    />
                ))}

                <TouchableOpacity style={styles.addButton} onPress={handleAddDish}>
                    <Text style={styles.addButtonText}>Adicionar prato</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                <Text style={styles.sectionTitle}>Possibilidade de alteração do cardápio</Text>

                <Checkbox
                    label="Opções veganas e vegetarianas, caso necessário"
                    checked={data.veganOptions}
                    onChange={setVeganOptions}
                    style={styles.optionCheckbox}
                />
                <Checkbox
                    label="Farei substituições no menu, caso necessário (alergias alimentares, por exemplo)"
                    checked={data.substitutions}
                    onChange={setSubstitutions}
                    style={styles.optionCheckbox}
                />
                <Checkbox
                    label="O cardápio pode sofrer leves alterações dependendo da disponibilidade de ingredientes"
                    checked={data.menuAlterations}
                    onChange={setMenuAlterations}
                    style={styles.optionCheckbox}
                />

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
        marginBottom: 16,
    },
    checkbox: {
        marginBottom: 24,
    },
    optionCheckbox: {
        marginBottom: 16,
    },
    addButton: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 8,
    },
    addButtonText: {
        color: '#FF8C42',
        fontWeight: 'bold',
        fontSize: 16,
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
