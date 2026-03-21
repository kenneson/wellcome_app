import { CreateEventHeader } from '@/components/ui/CreateEventHeader';
import { WizardProgress } from '@/components/ui/WizardProgress';
import { useEventDetailsViewModel } from '@/features/events/create/useEventDetailsViewModel';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    Alert,
    Image,
    Modal,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// ============================================================================
// Types
// ============================================================================

type PickerMode = 'date' | 'startTime' | 'endTime' | 'deadline' | null;

// ============================================================================
// Helpers
// ============================================================================

const MONTHS_PT = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const WEEKDAYS_PT = [
    'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
    'Quinta-feira', 'Sexta-feira', 'Sábado',
];

function formatTime(date: Date | null): string {
    if (!date) return '--:--';
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function calcDuration(start: Date | null, end: Date | null): string | null {
    if (!start || !end) return null;
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) return null;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours === 0) return `${minutes}min`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h${minutes}min`;
}

// ============================================================================
// Sub-components
// ============================================================================

interface DateCardProps {
    date: Date | null;
    onPress: () => void;
    isCompact: boolean;
}

function DateCard({ date, onPress, isCompact }: DateCardProps) {
    if (!date) {
        return (
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.7}
                className="border-2 border-dashed border-orange-200 rounded-2xl bg-orange-50/50 items-center justify-center"
                style={{ paddingVertical: isCompact ? 20 : 28 }}
            >
                <View className="w-12 h-12 rounded-full bg-orange-100 items-center justify-center mb-2">
                    <Ionicons name="calendar-outline" size={24} color="#FF8C42" />
                </View>
                <Text className="text-sm font-semibold text-[#FF8C42]">Selecionar data</Text>
                <Text className="text-xs text-gray-400 mt-1">Toque para escolher</Text>
            </TouchableOpacity>
        );
    }

    const day = date.getDate();
    const month = MONTHS_PT[date.getMonth()];
    const year = date.getFullYear();
    const weekday = WEEKDAYS_PT[date.getDay()];

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            className="bg-gradient rounded-2xl overflow-hidden"
        >
            <View className="bg-[#FF8C42] rounded-2xl" style={{ padding: isCompact ? 14 : 18 }}>
                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                        <View className="bg-white/20 rounded-xl items-center justify-center mr-3" style={{ width: isCompact ? 48 : 56, height: isCompact ? 48 : 56 }}>
                            <Text className="text-white font-extrabold" style={{ fontSize: isCompact ? 22 : 26 }}>{day}</Text>
                        </View>
                        <View className="flex-1">
                            <Text className="text-white/80 text-xs font-medium uppercase tracking-wider">{weekday}</Text>
                            <Text className="text-white font-bold" style={{ fontSize: isCompact ? 16 : 18 }}>
                                {month} {year}
                            </Text>
                        </View>
                    </View>
                    <View className="bg-white/20 w-8 h-8 rounded-full items-center justify-center">
                        <Ionicons name="pencil" size={14} color="#FFF" />
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

interface TimeSlotProps {
    label: string;
    time: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    isActive: boolean;
    accentColor: string;
}

function TimeSlot({ label, time, icon, onPress, isActive, accentColor }: TimeSlotProps) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            className={`flex-1 rounded-xl border-2 ${isActive ? 'border-[#FF8C42] bg-orange-50' : 'border-gray-100 bg-white'}`}
            style={{ paddingVertical: 14, paddingHorizontal: 14 }}
        >
            <View className="flex-row items-center mb-1.5">
                <Ionicons name={icon} size={14} color={isActive ? accentColor : '#9CA3AF'} />
                <Text className={`text-[11px] font-semibold ml-1.5 uppercase tracking-wider ${isActive ? 'text-[#FF8C42]' : 'text-gray-400'}`}>
                    {label}
                </Text>
            </View>
            <Text className={`font-bold ${isActive ? 'text-[#1A1A1A]' : 'text-gray-300'}`} style={{ fontSize: 22 }}>
                {time}
            </Text>
        </TouchableOpacity>
    );
}

interface IOSPickerModalProps {
    visible: boolean;
    title: string;
    value: Date;
    mode: 'date' | 'time';
    minimumDate?: Date;
    onConfirm: (date: Date) => void;
    onCancel: () => void;
}

function IOSPickerModal({ visible, title, value, mode, minimumDate, onConfirm, onCancel }: IOSPickerModalProps) {
    const [tempDate, setTempDate] = useState(value);

    // Reset temp date when modal opens with a new value
    React.useEffect(() => {
        if (visible) setTempDate(value);
    }, [visible, value]);

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View className="flex-1 justify-end bg-black/40">
                <View className="bg-white rounded-t-3xl">
                    <View className="flex-row justify-between items-center px-6 pt-5 pb-3">
                        <TouchableOpacity onPress={onCancel}>
                            <Text className="text-base text-gray-500 font-medium">Cancelar</Text>
                        </TouchableOpacity>
                        <Text className="text-base font-bold text-[#1A1A1A]">{title}</Text>
                        <TouchableOpacity onPress={() => onConfirm(tempDate)}>
                            <Text className="text-base text-[#FF8C42] font-bold">Confirmar</Text>
                        </TouchableOpacity>
                    </View>
                    <View className="items-center pb-8 w-full px-4">
                        <DateTimePicker
                            value={tempDate}
                            mode={mode}
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            themeVariant="light"
                            textColor="#000000"
                            is24Hour={true}
                            minimumDate={minimumDate}
                            onChange={(_event: any, selectedDate?: Date) => {
                                if (selectedDate) setTempDate(selectedDate);
                            }}
                            locale="pt-BR"
                            style={{ 
                                height: 200, 
                                width: '100%',
                                backgroundColor: 'transparent'
                            }}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ============================================================================
// Main Component
// ============================================================================

export default function EventCreateStep4() {
    const router = useRouter();
    const vm = useEventDetailsViewModel();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();

    // Responsive breakpoints
    const isSmallScreen = width < 375;
    const isMediumScreen = width >= 375 && width < 414;
    const isLargeScreen = width >= 414;

    const horizontalPadding = isSmallScreen ? 16 : isMediumScreen ? 20 : 24;

    // Picker state
    const [activePicker, setActivePicker] = useState<PickerMode>(null);

    // Derived data
    const eventDate = vm.data.details.date;
    const endTimeDate = vm.data.details.endTime;
    const deadlineDate = vm.data.details.registrationDeadline;

    const defaultEndTime = useMemo(() => {
        if (!eventDate) return new Date();
        return new Date(eventDate.getTime() + 4 * 60 * 60 * 1000);
    }, [eventDate]);

    const timeStartStr = formatTime(eventDate);
    const timeEndStr = formatTime(endTimeDate || (eventDate ? defaultEndTime : null));

    const duration = useMemo(() => {
        const end = endTimeDate || (eventDate ? defaultEndTime : null);
        return calcDuration(eventDate, end);
    }, [eventDate, endTimeDate, defaultEndTime]);

    const deadlineLabel = deadlineDate
        ? deadlineDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
        : 'Definir prazo';

    // Handlers
    const handleBack = () => router.back();

    const handleNext = () => {
        if (!vm.data.details.title || !vm.data.details.pricePerGuest || !vm.data.details.maxGuests || !vm.data.details.date) {
            Alert.alert('Dados incompletos', 'Preencha Título, Preço, Vagas e Data.');
            return;
        }
        router.push('/events/create/settings');
    };

    const openPicker = useCallback((mode: PickerMode) => {
        setActivePicker(mode);
    }, []);

    const closePicker = useCallback(() => {
        setActivePicker(null);
    }, []);

    // Handle date/time confirmation (for iOS modal)
    const handlePickerConfirm = useCallback((selectedDate: Date) => {
        switch (activePicker) {
            case 'date':
                vm.updateDetails({ date: selectedDate });
                break;
            case 'startTime':
                if (eventDate) {
                    const newDate = new Date(eventDate);
                    newDate.setHours(selectedDate.getHours());
                    newDate.setMinutes(selectedDate.getMinutes());
                    vm.updateDetails({ date: newDate });
                }
                break;
            case 'endTime':
                vm.updateDetails({ endTime: selectedDate });
                break;
            case 'deadline':
                vm.updateDetails({ registrationDeadline: selectedDate });
                break;
        }
        closePicker();
    }, [activePicker, eventDate, vm, closePicker]);

    // Handle Android picker onChange (auto-closes)
    const handleAndroidChange = useCallback((pickerType: PickerMode) => (_event: any, selectedDate?: Date) => {
        setActivePicker(null);
        if (!selectedDate) return;

        switch (pickerType) {
            case 'date':
                vm.updateDetails({ date: selectedDate });
                break;
            case 'startTime':
                if (eventDate) {
                    const newDate = new Date(eventDate);
                    newDate.setHours(selectedDate.getHours());
                    newDate.setMinutes(selectedDate.getMinutes());
                    vm.updateDetails({ date: newDate });
                }
                break;
            case 'endTime':
                vm.updateDetails({ endTime: selectedDate });
                break;
            case 'deadline':
                vm.updateDetails({ registrationDeadline: selectedDate });
                break;
        }
    }, [eventDate, vm]);

    // Picker values
    const getPickerValue = useCallback((): Date => {
        switch (activePicker) {
            case 'date': return eventDate || new Date();
            case 'startTime': return eventDate || new Date();
            case 'endTime': return endTimeDate || defaultEndTime;
            case 'deadline': return deadlineDate || new Date();
            default: return new Date();
        }
    }, [activePicker, eventDate, endTimeDate, defaultEndTime, deadlineDate]);

    const getPickerMode = useCallback((): 'date' | 'time' => {
        return activePicker === 'date' || activePicker === 'deadline' ? 'date' : 'time';
    }, [activePicker]);

    const getPickerTitle = useCallback((): string => {
        switch (activePicker) {
            case 'date': return 'Data do evento';
            case 'startTime': return 'Horário de início';
            case 'endTime': return 'Horário de término';
            case 'deadline': return 'Prazo de inscrição';
            default: return '';
        }
    }, [activePicker]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
            <CreateEventHeader />

            <KeyboardAwareScrollView
                enableOnAndroid={true}
                extraScrollHeight={20}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
            >
                    {/* Wizard Progress */}
                    <View style={{ paddingHorizontal: horizontalPadding }} className="py-3">
                        <WizardProgress currentStep={3} />
                    </View>

                    <View style={{ paddingHorizontal: horizontalPadding }}>
                        {/* Section Title */}
                        <Text
                            className="font-bold text-[#1A1A1A] mb-1 mt-1"
                            style={{ fontSize: isSmallScreen ? 18 : 22 }}
                        >
                            Detalhes do evento
                        </Text>
                        <Text className="text-sm text-gray-400 mb-5">
                            Informações de data, horário e vagas
                        </Text>

                        {/* Cover Image */}
                        <TouchableOpacity
                            onPress={vm.pickImage}
                            activeOpacity={0.9}
                            className="w-full rounded-2xl overflow-hidden mb-6 bg-gray-50 border border-gray-100"
                            style={{ height: isSmallScreen ? 150 : isMediumScreen ? 180 : 200 }}
                        >
                            {vm.data.details.coverImage ? (
                                <View className="flex-1">
                                    <Image source={{ uri: vm.data.details.coverImage }} className="w-full h-full" resizeMode="cover" />
                                    <View className="absolute bottom-3 right-3 bg-black/50 rounded-full px-3 py-1.5 flex-row items-center">
                                        <Ionicons name="camera" size={14} color="#FFF" />
                                        <Text className="text-white text-xs font-medium ml-1.5">Alterar</Text>
                                    </View>
                                </View>
                            ) : (
                                <View className="flex-1 items-center justify-center">
                                    <View className="w-14 h-14 rounded-full bg-gray-100 items-center justify-center mb-2">
                                        <Ionicons name="camera-outline" size={isSmallScreen ? 24 : 28} color="#9CA3AF" />
                                    </View>
                                    <Text className="text-sm text-gray-500 font-semibold">Adicionar capa</Text>
                                    <Text className="text-xs text-gray-400 mt-0.5">Proporção 16:9 recomendada</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Price & Guests Row */}
                        <View className={`${isSmallScreen ? 'flex-col' : 'flex-row'} gap-3 mb-6`}>
                            <View className={isSmallScreen ? 'w-full' : 'flex-1'}>
                                <Text className="text-xs text-gray-500 mb-1.5 font-semibold ml-1 uppercase tracking-wider">
                                    Valor por convidado
                                </Text>
                                <View className="flex-row items-center border border-gray-200 rounded-xl bg-white" style={{ paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 12 }}>
                                    <View className="bg-green-50 rounded-lg px-2 py-1 mr-2">
                                        <Text className="text-sm font-bold text-green-600">R$</Text>
                                    </View>
                                    <TextInput
                                        className="flex-1 text-base text-[#1A1A1A] font-semibold"
                                        placeholder="0,00"
                                        placeholderTextColor="#D1D5DB"
                                        value={vm.data.details.pricePerGuest}
                                        onChangeText={(text) => vm.updateDetails({ pricePerGuest: text })}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>

                            <View className={isSmallScreen ? 'w-full' : 'flex-1'}>
                                <Text className="text-xs text-gray-500 mb-1.5 font-semibold ml-1 uppercase tracking-wider">
                                    Máximo de convidados
                                </Text>
                                <View className="flex-row items-center border border-gray-200 rounded-xl bg-white" style={{ paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 12 }}>
                                    <View className="bg-blue-50 rounded-lg p-1.5 mr-2">
                                        <Ionicons name="people-outline" size={16} color="#3B82F6" />
                                    </View>
                                    <TextInput
                                        className="flex-1 text-base text-[#1A1A1A] font-semibold"
                                        placeholder="Ex: 10"
                                        placeholderTextColor="#D1D5DB"
                                        value={vm.data.details.maxGuests}
                                        onChangeText={(text) => vm.updateDetails({ maxGuests: text })}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Date & Time Section */}
                        <View className="bg-gray-50 rounded-2xl overflow-hidden mb-6">
                            {/* Section Header */}
                            <View className="flex-row items-center px-4 pt-4 pb-2">
                                <View className="bg-orange-100 rounded-lg p-1.5 mr-2">
                                    <Ionicons name="calendar" size={14} color="#FF8C42" />
                                </View>
                                <Text className="text-sm font-bold text-[#1A1A1A]">Data e horário</Text>
                            </View>

                            {/* Date Card */}
                            <View className="px-4 pb-3">
                                <DateCard
                                    date={eventDate}
                                    onPress={() => openPicker('date')}
                                    isCompact={isSmallScreen}
                                />
                            </View>

                            {/* Time Selectors */}
                            <View className="px-4 pb-4">
                                <View className="flex-row gap-3 mb-2">
                                    <TimeSlot
                                        label="Início"
                                        time={timeStartStr}
                                        icon="play-circle-outline"
                                        onPress={() => openPicker('startTime')}
                                        isActive={timeStartStr !== '--:--'}
                                        accentColor="#FF8C42"
                                    />
                                    <TimeSlot
                                        label="Término"
                                        time={timeEndStr}
                                        icon="stop-circle-outline"
                                        onPress={() => openPicker('endTime')}
                                        isActive={timeEndStr !== '--:--'}
                                        accentColor="#FF8C42"
                                    />
                                </View>

                                {/* Duration Badge */}
                                {duration && (
                                    <View className="flex-row items-center justify-center mt-1">
                                        <View className="bg-orange-100 rounded-full flex-row items-center px-3 py-1.5">
                                            <Ionicons name="time-outline" size={13} color="#FF8C42" />
                                            <Text className="text-xs font-semibold text-[#FF8C42] ml-1.5">
                                                Duração: {duration}
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Registration Deadline */}
                        <View className="mb-6">
                            <Text className="text-xs text-gray-500 mb-1.5 font-semibold ml-1 uppercase tracking-wider">
                                Prazo para inscrições
                            </Text>
                            <TouchableOpacity
                                onPress={() => openPicker('deadline')}
                                activeOpacity={0.7}
                                className={`border rounded-xl px-4 flex-row justify-between items-center ${deadlineDate ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-white'}`}
                                style={{ paddingVertical: 14 }}
                            >
                                <View className="flex-row items-center flex-1">
                                    <View className={`rounded-lg p-1.5 mr-2.5 ${deadlineDate ? 'bg-orange-100' : 'bg-gray-100'}`}>
                                        <Ionicons
                                            name="hourglass-outline"
                                            size={16}
                                            color={deadlineDate ? '#FF8C42' : '#9CA3AF'}
                                        />
                                    </View>
                                    <Text className={`text-base font-medium ${deadlineDate ? 'text-[#1A1A1A]' : 'text-gray-400'}`}>
                                        {deadlineLabel}
                                    </Text>
                                </View>
                                <Ionicons
                                    name="chevron-forward"
                                    size={16}
                                    color={deadlineDate ? '#FF8C42' : '#D1D5DB'}
                                />
                            </TouchableOpacity>
                            {deadlineDate && eventDate && deadlineDate >= eventDate && (
                                <View className="flex-row items-center mt-2 ml-1">
                                    <Ionicons name="warning-outline" size={14} color="#F59E0B" />
                                    <Text className="text-xs text-amber-500 ml-1 font-medium">
                                        O prazo deve ser anterior à data do evento
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
            </KeyboardAwareScrollView>

            {/* Bottom CTA */}
            <View
                className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100"
                style={{
                    paddingBottom: Math.max(insets.bottom, 16),
                    paddingHorizontal: horizontalPadding,
                    paddingTop: 14,
                }}
            >
                <TouchableOpacity
                    className="h-[52px] rounded-2xl items-center justify-center bg-[#FF8C42]"
                    onPress={handleNext}
                    activeOpacity={0.8}
                    style={{
                        shadowColor: '#FF8C42',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.25,
                        shadowRadius: 8,
                        elevation: 4,
                    }}
                >
                    <Text className="text-[16px] font-bold text-white">
                        Salvar e prosseguir
                    </Text>
                </TouchableOpacity>
            </View>

            {/* iOS Picker Modals */}
            {Platform.OS === 'ios' && activePicker && (
                <IOSPickerModal
                    visible={true}
                    title={getPickerTitle()}
                    value={getPickerValue()}
                    mode={getPickerMode()}
                    minimumDate={activePicker === 'date' ? new Date() : undefined}
                    onConfirm={handlePickerConfirm}
                    onCancel={closePicker}
                />
            )}

            {/* Android Pickers (native dialogs) */}
            {Platform.OS === 'android' && activePicker === 'date' && (
                <DateTimePicker
                    value={eventDate || new Date()}
                    mode="date"
                    display="default"
                    themeVariant="light"
                    onChange={handleAndroidChange('date')}
                    minimumDate={new Date()}
                />
            )}
            {Platform.OS === 'android' && activePicker === 'startTime' && (
                <DateTimePicker
                    value={eventDate || new Date()}
                    mode="time"
                    display="default"
                    themeVariant="light"
                    is24Hour={true}
                    onChange={handleAndroidChange('startTime')}
                />
            )}
            {Platform.OS === 'android' && activePicker === 'endTime' && (
                <DateTimePicker
                    value={endTimeDate || defaultEndTime}
                    mode="time"
                    display="default"
                    themeVariant="light"
                    is24Hour={true}
                    onChange={handleAndroidChange('endTime')}
                />
            )}
            {Platform.OS === 'android' && activePicker === 'deadline' && (
                <DateTimePicker
                    value={deadlineDate || new Date()}
                    mode="date"
                    display="default"
                    themeVariant="light"
                    onChange={handleAndroidChange('deadline')}
                />
            )}
        </SafeAreaView>
    );
}
