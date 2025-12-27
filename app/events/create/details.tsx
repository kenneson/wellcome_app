import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker'; // Note: Must verify if installed or use alternate
import { WizardProgress } from '@/components/event-creation/WizardProgress';
import { useEventCreation } from '@/context/EventCreationContext';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function EventCreateStep4() {
    const router = useRouter();
    const { data, updateDetails } = useEventCreation();
    const [submitting, setSubmitting] = useState(false);

    // Date Pickers State
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);

    // Helper to format date
    const formatDate = (date: Date | null) => {
        if (!date) return 'Selecione';
        return date.toLocaleDateString('pt-BR');
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            updateDetails({ date: selectedDate });
        }
    };

    const handleDeadlineChange = (event: any, selectedDate?: Date) => {
        setShowDeadlinePicker(Platform.OS === 'ios');
        if (selectedDate) {
            updateDetails({ registrationDeadline: selectedDate });
        }
    };

    const handleSubmit = async () => {
        // Validation
        if (!data.details.pricePerGuest || !data.details.maxGuests || !data.details.date || !data.details.registrationDeadline) {
            Alert.alert('Dados incompletos', 'Preencha todos os campos obrigatórios.');
            return;
        }

        setSubmitting(true);
        try {
            // TODO: Call context submit
            // await submitEvent();

            // Improve simulation
            await new Promise(resolve => setTimeout(resolve, 2000));

            Alert.alert('Sucesso', 'Evento criado com sucesso!', [
                { text: 'OK', onPress: () => router.push('/(tabs)') }
            ]);
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível criar o evento.');
        } finally {
            setSubmitting(false);
        }
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

            <WizardProgress currentStep={3} />

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.sectionTitle}>Mais informações sobre o seu evento</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Valor por convidado</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="R$"
                        value={data.details.pricePerGuest}
                        onChangeText={(text) => updateDetails({ pricePerGuest: text })}
                        keyboardType="numeric"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Número máximo de convidados</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Selecione"
                        value={data.details.maxGuests}
                        onChangeText={(text) => updateDetails({ maxGuests: text })}
                        keyboardType="numeric"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Data de realização</Text>
                    <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Text style={styles.dateText}>{formatDate(data.details.date)}</Text>
                        <IconSymbol name="calendar" size={20} color="#666" />
                    </TouchableOpacity>
                    {showDatePicker && (
                        <DateTimePicker
                            value={data.details.date || new Date()}
                            mode="date"
                            display="default"
                            onChange={handleDateChange}
                        />
                    )}
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Vagas abertas até</Text>
                    <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowDeadlinePicker(true)}
                    >
                        <Text style={styles.dateText}>{formatDate(data.details.registrationDeadline)}</Text>
                        <IconSymbol name="calendar" size={20} color="#666" />
                    </TouchableOpacity>
                    {showDeadlinePicker && (
                        <DateTimePicker
                            value={data.details.registrationDeadline || new Date()}
                            mode="date"
                            display="default"
                            onChange={handleDeadlineChange}
                        />
                    )}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.nextButton, submitting && styles.disabledButton]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.nextButtonText}>Salvar e prosseguir</Text>
                    )}
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
        marginBottom: 24,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 12,
        color: '#666',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    dateButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 12,
    },
    dateText: {
        fontSize: 16,
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
    disabledButton: {
        opacity: 0.7,
    },
    nextButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
