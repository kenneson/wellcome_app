import { SelectionSection } from '@/components/ui/SelectionSection';
import { eventService } from '@/services/api/EventService';
import { Colors } from '@/shared/constants/theme';
import { EventCreationProvider, useEventCreation } from '@/shared/context/EventCreationContext';
import { EventCreationState } from '@/entities/event/model/types';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';

const C = Colors.host;

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
    const [initialBackendData, setInitialBackendData] = useState<any>(null);

    useEffect(() => {
        if (id) fetchEvent();
    }, [id]);

    async function fetchEvent() {
        try {
            setLoading(true);
            const eventData = await eventService.getEventById(id as string);
            setInitialBackendData(eventData);
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
            
            // Build Delta Payload
            const deltaData: Partial<EventCreationState> = {
                details: {} as any,
                location: {} as any
            };
            
            if (data.details.title !== initialBackendData.title) deltaData.details!.title = data.details.title;
            if (data.details.description !== initialBackendData.description) deltaData.details!.description = data.details.description;
            if (data.details.pricePerGuest !== initialBackendData.price?.toString()) deltaData.details!.pricePerGuest = data.details.pricePerGuest;
            if (data.details.maxGuests !== initialBackendData.maxGuests?.toString()) deltaData.details!.maxGuests = data.details.maxGuests;
            
            const currentIsoDate = data.details.date?.toISOString();
            const initialIsoDate = initialBackendData.eventDate ? new Date(initialBackendData.eventDate).toISOString() : null;
            if (currentIsoDate !== initialIsoDate) deltaData.details!.date = data.details.date;

            if (data.location.address !== initialBackendData.location) deltaData.location!.address = data.location.address;

            if (data.eventType !== initialBackendData.eventType) deltaData.eventType = data.eventType;
            if (JSON.stringify(data.cuisineTypes) !== JSON.stringify(initialBackendData.cuisineTypes)) deltaData.cuisineTypes = data.cuisineTypes;
            if (JSON.stringify(data.vibe) !== JSON.stringify(initialBackendData.vibe)) deltaData.vibe = data.vibe;

            // Optional: send dishes only if modified (simplified: if count changed or basic check)
            // For full safety, dishes usually need a more complex diff. We'll leave them out of delta unless heavily needed, 
            // or pass undefined if they weren't edited. In this screen we don't even expose dish editing, so we omit them.
            
            // Cleanup empty objects to avoid wiping out other details
            if (Object.keys(deltaData.details!).length === 0) deltaData.details = undefined;
            if (Object.keys(deltaData.location!).length === 0) deltaData.location = undefined;

            await eventService.updateEvent(id as string, deltaData);
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
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={C.accent} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={[C.headerBg, C.primary]} style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Editar Evento</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
                    {saving ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <Text style={styles.saveBtnText}>Salvar</Text>
                    )}
                </TouchableOpacity>
            </LinearGradient>

            <KeyboardAwareScrollView
                enableOnAndroid={true}
                extraScrollHeight={40}
                extraHeight={120}
                enableResetScrollToCoords={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.content}
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.sectionHeader}>Informações Básicas</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Título do Evento</Text>
                    <TextInput
                        style={styles.input}
                        value={data.details.title}
                        onChangeText={(text) => updateDetails({ title: text })}
                        placeholder="Nome do seu evento"
                        placeholderTextColor={C.textSecondary}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Descrição</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={data.details.description}
                        onChangeText={(text) => updateDetails({ description: text })}
                        placeholder="Descreva seu evento..."
                        placeholderTextColor={C.textSecondary}
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
                            <Ionicons name="calendar-outline" size={18} color={C.accent} style={{ marginRight: 6 }} />
                            <Text style={styles.dateButtonText}>{data.details.date ? data.details.date.toLocaleDateString('pt-BR') : 'Selecionar'}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                        <Text style={styles.label}>Horário</Text>
                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => setShowTimePicker(true)}
                        >
                            <Ionicons name="time-outline" size={18} color={C.accent} style={{ marginRight: 6 }} />
                            <Text style={styles.dateButtonText}>{data.details.date ? data.details.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Selecionar'}</Text>
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
                        placeholderTextColor={C.textSecondary}
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
                            placeholderTextColor={C.textSecondary}
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
                    theme="host"
                />

                <View style={styles.divider} />

                <SelectionSection
                    title="Culinária"
                    items={CUISINE_TYPES}
                    selectedItems={data.cuisineTypes}
                    onSelect={toggleCuisineType}
                    isMultiSelect
                    theme="host"
                />

                <View style={styles.divider} />

                <SelectionSection
                    title="Vibe"
                    items={VIBES}
                    selectedItems={data.vibe || []}
                    onSelect={toggleVibe}
                    isMultiSelect
                    theme="host"
                />

                <View style={{ height: 40 }} />
            </KeyboardAwareScrollView>
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
        backgroundColor: C.background,
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
        paddingTop: Platform.OS === 'android' ? 12 : 0,
        paddingBottom: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
    },
    saveBtn: {
        backgroundColor: C.accent,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 70,
        alignItems: 'center',
    },
    saveBtnText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    content: {
        padding: 20,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        color: C.textPrimary,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: C.textSecondary,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: C.textPrimary,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    textArea: {
        height: 120,
    },
    row: {
        flexDirection: 'row',
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    dateButtonText: {
        fontSize: 15,
        color: C.textPrimary,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: C.border,
        marginVertical: 24,
    },
});
