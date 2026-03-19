import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EventCreationProvider, useEventCreation } from '@/shared/context/EventCreationContext';
import { eventService } from '@/services/api/EventService';
import { SelectionSection } from '@/components/ui/SelectionSection';
import { supabase } from '@/shared/lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';

// Reusing constants from create flow (ideally should be shared)
const EVENT_TYPES = [
    'Café da manhã', 'Brunch', 'Almoço', 'Lanche', 'Jantar', 'Degustação', 'Pic-nic', 'Coquetel', 'Outro'
] as const;

const CUISINE_TYPES = [
    'Africana', 'Alemã', 'Asiática', 'Árabe', 'Argentina', 'Baiana', 'Brasileira', 'Carnes',
    'Café colonial', 'Chinesa', 'Colombiana', 'Contemporânea', 'Coreana', 'Crepes', 'Doces e bolos',
    'Espanhola', 'Francesa', 'Frutos do mar', 'Gaúcha', 'Grega', 'Hamburguer', 'Indiana',
    'Italiana', 'Japonesa', 'Lanches', 'Mexicana', 'Mineira', 'Mediterrânea', 'Nordestina',
    'Pasteis', 'Peruana', 'Pizza', 'Portuguesa', 'Sopas e Caldos', 'Tailandesa', 'Variada',
    'Vegana', 'Vegetariana'
] as const;

const VIBES = [
    'Família', 'Networking', 'Espiritual', 'Casual', 'Romântico', 'Festa', 'Jantar a dois', 'Negócios'
] as const;

function EditEventForm() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const {
        data,
        loadEvent,
        setEventType,
        toggleCuisineType,
        toggleVibe,
        updateDetails,
        updateLocation
    } = useEventCreation();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    useEffect(() => {
        if (id) fetchEvent();
    }, [id]);

    async function fetchEvent() {
        try {
            setLoading(true);
            const eventData = await eventService.getEventById(id as string);
            loadEvent(eventData);
        } catch (error: any) {
            Alert.alert('Erro', 'Não foi possível carregar o evento.');
            router.back();
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        if (!data.details.title || !data.details.date || !data.location.address) {
            Alert.alert('Erro', 'Preencha os campos obrigatórios (Título, Data, Local).');
            return;
        }

        try {
            setSaving(true);
            await eventService.updateEvent(id as string, data);
            Alert.alert('Sucesso', 'Evento atualizado com sucesso!');
            router.back();
        } catch (error: any) {
            Alert.alert('Erro', error.message);
        } finally {
            setSaving(false);
        }
    }

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate && data.details.date) {
            const currentDate = data.details.date;
            const newDate = new Date(selectedDate);
            newDate.setHours(currentDate.getHours());
            newDate.setMinutes(currentDate.getMinutes());
            updateDetails({ date: newDate });
        } else if (selectedDate) {
            updateDetails({ date: selectedDate });
        }
    };

    const onTimeChange = (event: any, selectedDate?: Date) => {
        setShowTimePicker(false);
        if (selectedDate && data.details.date) {
            const currentDate = data.details.date;
            const newTime = new Date(selectedDate);
            currentDate.setHours(newTime.getHours());
            currentDate.setMinutes(newTime.getMinutes());
            updateDetails({ date: new Date(currentDate) }); // Force new reference
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF8C42" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Editar Evento</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving}>
                    <Text style={[styles.saveButton, saving && styles.disabledText]}>
                        {saving ? 'Salvando...' : 'Salvar'}
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Basic Info */}
                <Text style={styles.sectionHeader}>Informações Básicas</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Título do Evento</Text>
                    <TextInput
                        style={styles.input}
                        value={data.details.title}
                        onChangeText={(text) => updateDetails({ title: text })}
                        placeholder="Nome do seu evento"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Descrição</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={data.details.description}
                        onChangeText={(text) => updateDetails({ description: text })}
                        placeholder="Descreva seu evento..."
                        multiline
                        textAlignVertical="top"
                    />
                </View>

                {/* Date & Time */}
                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                        <Text style={styles.label}>Data</Text>
                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Text>{data.details.date ? data.details.date.toLocaleDateString('pt-BR') : 'Selecionar'}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                        <Text style={styles.label}>Horário</Text>
                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => setShowTimePicker(true)}
                        >
                            <Text>{data.details.date ? data.details.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Selecionar'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {showDatePicker && (
                    <DateTimePicker
                        value={data.details.date || new Date()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'inline' : 'default'}
                        themeVariant="light"
                        textColor="#000000"
                        onChange={onDateChange}
                        minimumDate={new Date()}
                        style={Platform.OS === 'ios' ? { height: 320, width: '100%' } : undefined}
                    />
                )}
                {showTimePicker && (
                    <DateTimePicker
                        value={data.details.date || new Date()}
                        mode="time"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        themeVariant="light"
                        textColor="#000000"
                        onChange={onTimeChange}
                        style={Platform.OS === 'ios' ? { height: 200, width: '100%' } : undefined}
                    />
                )}

                {/* Location */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Localização (Endereço)</Text>
                    <TextInput
                        style={styles.input}
                        value={data.location.address}
                        onChangeText={(text) => updateLocation({ address: text })}
                        placeholder="Endereço completo"
                    />
                </View>

                {/* Guests & Price */}
                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                        <Text style={styles.label}>Máx. Convidados</Text>
                        <TextInput
                            style={styles.input}
                            value={data.details.maxGuests}
                            onChangeText={(text) => updateDetails({ maxGuests: text })}
                            keyboardType="numeric"
                        />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                        <Text style={styles.label}>Preço (R$)</Text>
                        <TextInput
                            style={styles.input}
                            value={data.details.pricePerGuest}
                            onChangeText={(text) => updateDetails({ pricePerGuest: text })}
                            keyboardType="numeric"
                            placeholder="0,00"
                        />
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Categories */}
                <SelectionSection
                    title="Tipo de Evento"
                    items={EVENT_TYPES}
                    selectedItems={data.eventType}
                    onSelect={setEventType}
                />

                <View style={styles.divider} />

                <SelectionSection
                    title="Culinária"
                    items={CUISINE_TYPES}
                    selectedItems={data.cuisineTypes}
                    onSelect={toggleCuisineType}
                    isMultiSelect
                />

                <View style={styles.divider} />

                <SelectionSection
                    title="Vibe"
                    items={VIBES}
                    selectedItems={data.vibe || []}
                    onSelect={toggleVibe}
                    isMultiSelect
                />

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

export default function EditEventScreen() {
    return (
        <EventCreationProvider>
            <EditEventForm />
        </EventCreationProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    saveButton: {
        fontSize: 16,
        color: '#FF8C42',
        fontWeight: 'bold',
    },
    disabledText: {
        color: '#ccc',
    },
    content: {
        padding: 20,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#333',
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        color: '#333',
    },
    textArea: {
        height: 100,
    },
    row: {
        flexDirection: 'row',
    },
    dateButton: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: 24,
    },
});
