import { SelectionSection } from '@/components/ui/SelectionSection';
import { LocationAutocomplete } from '@/components/ui/LocationAutocomplete';
import { LocationMap } from '@/components/ui/LocationMap';
import { eventService } from '@/services/api/EventService';
import { EventCreationProvider, useEventCreation } from '@/shared/context/EventCreationContext';
import { INVALID_EVENT_PRICE_MESSAGE, isValidEventPrice, parseEventPrice } from '@/shared/config/payments';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    const [showLocationSearch, setShowLocationSearch] = useState(false);
    const loadEventRef = useRef(loadEvent);
    loadEventRef.current = loadEvent;

    const fetchEvent = useCallback(async () => {
        try {
            setLoading(true);
            const eventData = await eventService.getEventById(id as string);
            loadEventRef.current(eventData);
        } catch {
            Alert.alert('Erro', 'Não foi possível carregar o evento.');
            router.back();
        } finally {
            setLoading(false);
        }
    }, [id, router]);

    useEffect(() => {
        if (id) void fetchEvent();
    }, [id, fetchEvent]);

    async function handleSave() {
        if (
            !data.details.title || !data.details.pricePerGuest.trim() || !data.details.date ||
            !data.location.address || !data.location.city || !data.location.state ||
            data.location.latitude === null || data.location.longitude === null || !data.location.confirmed
        ) {
            Alert.alert('Revise o evento', 'Confirme titulo, data e localizacao completa antes de salvar.');
            return;
        }

        const price = parseEventPrice(data.details.pricePerGuest);
        if (!isValidEventPrice(price)) {
            Alert.alert('Valor invalido', INVALID_EVENT_PRICE_MESSAGE);
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
            const duration = data.details.endTime && data.details.endTime > currentDate
                ? data.details.endTime.getTime() - currentDate.getTime()
                : 4 * 60 * 60 * 1000;
            const newDate = new Date(selectedDate);
            newDate.setHours(currentDate.getHours());
            newDate.setMinutes(currentDate.getMinutes());
            updateDetails({ date: newDate, endTime: new Date(newDate.getTime() + duration) });
        } else if (selectedDate) {
            updateDetails({ date: selectedDate, endTime: new Date(selectedDate.getTime() + 4 * 60 * 60 * 1000) });
        }
    };

    const onTimeChange = (event: any, selectedDate?: Date) => {
        setShowTimePicker(false);
        if (selectedDate && data.details.date) {
            const currentDate = data.details.date;
            const duration = data.details.endTime && data.details.endTime > currentDate
                ? data.details.endTime.getTime() - currentDate.getTime()
                : 4 * 60 * 60 * 1000;
            const newTime = new Date(selectedDate);
            const nextStart = new Date(currentDate);
            nextStart.setHours(newTime.getHours());
            nextStart.setMinutes(newTime.getMinutes());
            updateDetails({ date: nextStart, endTime: new Date(nextStart.getTime() + duration) });
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

            <KeyboardAwareScrollView
                enableOnAndroid={true}
                extraScrollHeight={40}
                extraHeight={120}
                enableResetScrollToCoords={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.content}
                style={{ flex: 1 }}
            >
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
                    <TouchableOpacity style={styles.locationButton} onPress={() => setShowLocationSearch(true)}>
                        <Ionicons name="search" size={19} color="#C45D22" />
                        <View style={styles.locationTextContainer}>
                            <Text style={data.location.address ? styles.locationText : styles.locationPlaceholder} numberOfLines={2}>
                                {data.location.address || 'Buscar endereco completo'}
                            </Text>
                            {!!data.location.city && <Text style={styles.locationCity}>{data.location.city} - {data.location.state}</Text>}
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#73787E" />
                    </TouchableOpacity>
                </View>

                {data.location.latitude !== null && data.location.longitude !== null && (
                    <View style={styles.inputGroup}>
                        <LocationMap
                            latitude={data.location.latitude}
                            longitude={data.location.longitude}
                            confirmed={data.location.confirmed}
                            onConfirm={({ latitude, longitude }) => updateLocation({ latitude, longitude, confirmed: true })}
                        />
                    </View>
                )}

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
            </KeyboardAwareScrollView>

            <LocationAutocomplete
                type="address"
                value={data.location.address}
                visible={showLocationSearch}
                asModal
                onClose={() => setShowLocationSearch(false)}
                onSelectAddress={(result) => updateLocation({
                    address: result.displayName,
                    city: result.city,
                    state: result.stateCode || result.state,
                    neighborhood: result.neighborhood,
                    postalCode: result.postalCode,
                    latitude: result.lat,
                    longitude: result.lon,
                    confirmed: false,
                })}
            />
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
    locationButton: {
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    locationTextContainer: {
        flex: 1,
    },
    locationText: {
        color: '#333',
        fontSize: 15,
        fontWeight: '600',
    },
    locationPlaceholder: {
        color: '#73787E',
        fontSize: 15,
    },
    locationCity: {
        color: '#73787E',
        fontSize: 12,
        marginTop: 3,
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: 24,
    },
});
