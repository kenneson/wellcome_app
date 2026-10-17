import { SelectionSection } from '@/components/ui/SelectionSection';
import { LocationAutocomplete } from '@/components/ui/LocationAutocomplete';
import { LocationMap } from '@/components/ui/LocationMap';
import { eventService } from '@/services/api/EventService';
import { EventCreationProvider, useEventCreation } from '@/shared/context/EventCreationContext';
import { INVALID_EVENT_PRICE_MESSAGE, isValidEventPrice, parseEventPrice } from '@/shared/config/payments';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { BrandSheet, BrandStackHeader } from '@/components/ui/wellcome';
import { BorderRadius, Palette, Spacing } from '@/shared/constants/theme';

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
    // eslint-disable-next-line react-hooks/refs -- keeps the latest loader without refetching on every render
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
        // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch when the id changes
        if (id) void fetchEvent();
    }, [id, fetchEvent]);

    async function handleSave() {
        if (
            !data.details.title || !data.details.pricePerGuest.trim() || !data.details.date ||
            !data.location.address || !data.location.city || !data.location.state ||
            data.location.latitude === null || data.location.longitude === null || !data.location.confirmed
        ) {
            Alert.alert('Revise o evento', 'Confirme título, data e localização completa antes de salvar.');
            return;
        }

        const price = parseEventPrice(data.details.pricePerGuest);
        if (!isValidEventPrice(price)) {
            Alert.alert('Valor inválido', INVALID_EVENT_PRICE_MESSAGE);
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
            <View style={styles.container}>
                <BrandStackHeader eyebrow="SEU EVENTO" title="Editar evento" backIcon="close" onBack={() => router.back()} />
                <BrandSheet>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={Palette.orange} />
                    </View>
                </BrandSheet>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <BrandStackHeader
                eyebrow="SEU EVENTO"
                title="Editar evento"
                backIcon="close"
                onBack={() => router.back()}
                actions={(
                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={saving}
                        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                        accessibilityRole="button"
                        accessibilityLabel="Salvar alterações"
                        accessibilityState={{ disabled: saving, busy: saving }}
                    >
                        {saving && <ActivityIndicator size="small" color={Palette.orangeDeep} />}
                        <Text style={styles.saveButtonText}>
                            {saving ? 'Salvando...' : 'Salvar'}
                        </Text>
                    </TouchableOpacity>
                )}
            />
            <BrandSheet>

            <KeyboardAwareScrollView
                enableOnAndroid={true}
                extraScrollHeight={40}
                extraHeight={120}
                enableResetScrollToCoords={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.content}
                style={styles.flex}
            >
                {/* Basic Info */}
                <Text style={styles.sectionHeader}>Informações básicas</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Título do evento</Text>
                    <TextInput
                        style={styles.input}
                        value={data.details.title}
                        onChangeText={(text) => updateDetails({ title: text })}
                        placeholder="Nome do seu evento"
                        placeholderTextColor={Palette.subtle}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Descrição</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={data.details.description}
                        onChangeText={(text) => updateDetails({ description: text })}
                        placeholder="Descreva seu evento..."
                        placeholderTextColor={Palette.subtle}
                        multiline
                        textAlignVertical="top"
                    />
                </View>

                {/* Date & Time */}
                <View style={styles.row}>
                    <View style={[styles.inputGroup, styles.flex]}>
                        <Text style={styles.label}>Data</Text>
                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => setShowDatePicker(true)}
                            accessibilityRole="button"
                            accessibilityLabel="Data do evento"
                        >
                            <Ionicons name="calendar-outline" size={18} color={Palette.orangeDeep} />
                            <Text style={styles.dateText}>{data.details.date ? data.details.date.toLocaleDateString('pt-BR') : 'Selecionar'}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={[styles.inputGroup, styles.flex]}>
                        <Text style={styles.label}>Horário</Text>
                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => setShowTimePicker(true)}
                            accessibilityRole="button"
                            accessibilityLabel="Horário do evento"
                        >
                            <Ionicons name="time-outline" size={18} color={Palette.orangeDeep} />
                            <Text style={styles.dateText}>{data.details.date ? data.details.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Selecionar'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {showDatePicker && (
                    <DateTimePicker
                        value={data.details.date || new Date()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'inline' : 'default'}
                        themeVariant="light"
                        textColor={Palette.ink}
                        accentColor={Palette.orangeDeep}
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
                        textColor={Palette.ink}
                        accentColor={Palette.orangeDeep}
                        onChange={onTimeChange}
                        style={Platform.OS === 'ios' ? { height: 200, width: '100%' } : undefined}
                    />
                )}

                {/* Location */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Localização (Endereço)</Text>
                    <TouchableOpacity style={styles.locationButton} onPress={() => setShowLocationSearch(true)} accessibilityRole="button" accessibilityLabel="Buscar endereço">
                        <Ionicons name="search" size={19} color={Palette.orangeDeep} />
                        <View style={styles.locationTextContainer}>
                            <Text style={data.location.address ? styles.locationText : styles.locationPlaceholder} numberOfLines={2}>
                                {data.location.address || 'Buscar endereço completo'}
                            </Text>
                            {!!data.location.city && <Text style={styles.locationCity}>{data.location.city} - {data.location.state}</Text>}
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={Palette.muted} />
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
                    <View style={[styles.inputGroup, styles.flex]}>
                        <Text style={styles.label}>Máx. convidados</Text>
                        <TextInput
                            style={styles.input}
                            value={data.details.maxGuests}
                            onChangeText={(text) => updateDetails({ maxGuests: text })}
                            keyboardType="numeric"
                        />
                    </View>
                    <View style={[styles.inputGroup, styles.flex]}>
                        <Text style={styles.label}>Preço (R$)</Text>
                        <TextInput
                            style={styles.input}
                            value={data.details.pricePerGuest}
                            onChangeText={(text) => updateDetails({ pricePerGuest: text })}
                            keyboardType="numeric"
                            placeholder="0,00"
                            placeholderTextColor={Palette.subtle}
                        />
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Categories */}
                <SelectionSection
                    title="Tipo de evento"
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

                <View style={styles.bottomSpacer} />
            </KeyboardAwareScrollView>
            </BrandSheet>

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
        </View>
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
        backgroundColor: Palette.paper,
    },
    flex: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveButton: {
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.full,
        backgroundColor: Palette.surface,
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        fontSize: 14,
        fontWeight: '800',
        color: Palette.orangeDeep,
    },
    content: {
        padding: Spacing.xl,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: Spacing.lg,
        color: Palette.ink,
    },
    inputGroup: {
        marginBottom: Spacing.lg,
    },
    label: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        color: Palette.inkSoft,
        marginBottom: Spacing.sm,
    },
    input: {
        minHeight: 48,
        borderWidth: 1,
        borderColor: Palette.line,
        borderRadius: BorderRadius.lg,
        backgroundColor: Palette.surface,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        fontSize: 15,
        color: Palette.ink,
    },
    textArea: {
        height: 110,
    },
    row: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    dateButton: {
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: Palette.line,
        borderRadius: BorderRadius.lg,
        backgroundColor: Palette.surface,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
    },
    dateText: {
        fontSize: 15,
        fontWeight: '700',
        color: Palette.ink,
    },
    locationButton: {
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: Palette.line,
        borderRadius: BorderRadius.lg,
        backgroundColor: Palette.surface,
        paddingHorizontal: Spacing.lg,
        paddingVertical: 10,
    },
    locationTextContainer: {
        flex: 1,
    },
    locationText: {
        color: Palette.ink,
        fontSize: 15,
        fontWeight: '700',
    },
    locationPlaceholder: {
        color: Palette.subtle,
        fontSize: 15,
    },
    locationCity: {
        color: Palette.muted,
        fontSize: 12,
        marginTop: 3,
    },
    divider: {
        height: 1,
        backgroundColor: Palette.line,
        marginVertical: Spacing.xxl,
    },
    bottomSpacer: {
        height: 40,
    },
});
