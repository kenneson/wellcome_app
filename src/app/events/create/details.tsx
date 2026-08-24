import { CreateEventHeader } from '@/components/ui/CreateEventHeader';
import { WellcomeBottomBar, WellcomeButton, WellcomeDatePickerSheet, WellcomeField } from '@/components/ui/wellcome';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { WizardProgress } from '@/components/ui/WizardProgress';
import { validateEventStep } from '@/features/create-event/model/eventCreationValidation';
import { eventService } from '@/services/api/EventService';
import { formatEventPriceInput, parseEventPrice } from '@/shared/config/payments';
import { useEventCreation } from '@/shared/context/EventCreationContext';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type PickerKind = 'date' | 'start' | 'end' | 'deadlineDate' | 'deadlineTime' | null;

export default function EventCreateDateAndPrice() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const horizontalPadding = width < 375 ? 16 : width >= 414 ? 24 : 20;
    const creation = useEventCreation();
    const reducedMotion = useReducedMotion();
    const { setCurrentStep } = creation;
    const [activePicker, setActivePicker] = useState<PickerKind>(null);
    const [pickerValue, setPickerValue] = useState(new Date());
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [platformFeePercentage, setPlatformFeePercentage] = useState(10);
    const priceRef = useRef<TextInput>(null);
    const guestsRef = useRef<TextInput>(null);

    useEffect(() => setCurrentStep(3), [setCurrentStep]);
    useEffect(() => {
        eventService.getPaymentConfig()
            .then((config) => setPlatformFeePercentage(config.platformFeePercentage))
            .catch(() => undefined);
    }, []);

    const { date, endTime, registrationDeadline } = creation.data.details;
    const duration = useMemo(() => {
        if (!date || !endTime || endTime <= date) return '';
        const minutes = Math.round((endTime.getTime() - date.getTime()) / 60000);
        return `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}min` : ''}`;
    }, [date, endTime]);
    const price = parseEventPrice(creation.data.details.pricePerGuest);
    const feeRate = platformFeePercentage / 100;
    const estimatedNet = Number.isFinite(price) ? Math.max(0, price * (1 - feeRate)) : 0;

    const openPicker = (kind: Exclude<PickerKind, null>) => {
        const value = kind === 'end'
            ? endTime ?? (date ? new Date(date.getTime() + 4 * 3600000) : new Date())
            : kind.startsWith('deadline')
                ? registrationDeadline ?? new Date()
                : date ?? new Date();
        setPickerValue(value);
        setActivePicker(kind);
    };

    const applyPicker = (kind: Exclude<PickerKind, null>, selected: Date) => {
        if (kind === 'date') {
            const start = new Date(selected);
            start.setHours(date?.getHours() ?? 19, date?.getMinutes() ?? 0, 0, 0);
            const nextEnd = endTime && endTime > start ? endTime : new Date(start.getTime() + 4 * 3600000);
            creation.updateDetails({ date: start, endTime: nextEnd });
        } else if (kind === 'start') {
            const start = new Date(date ?? selected);
            start.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
            const nextEnd = endTime && endTime > start ? endTime : new Date(start.getTime() + 4 * 3600000);
            creation.updateDetails({ date: start, endTime: nextEnd });
        } else if (kind === 'end' && date) {
            const end = new Date(date);
            end.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
            if (end <= date) end.setDate(end.getDate() + 1);
            creation.updateDetails({ endTime: end });
        } else if (kind === 'deadlineDate') {
            const deadline = new Date(selected);
            deadline.setHours(registrationDeadline?.getHours() ?? 18, registrationDeadline?.getMinutes() ?? 0, 0, 0);
            creation.updateDetails({ registrationDeadline: deadline });
        } else if (kind === 'deadlineTime' && registrationDeadline) {
            const deadline = new Date(registrationDeadline);
            deadline.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
            creation.updateDetails({ registrationDeadline: deadline });
        }
        setActivePicker(null);
    };

    const handleNext = async () => {
        const nextErrors = validateEventStep(creation.data, 3);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            requestAnimationFrame(() => {
                if (nextErrors.price) priceRef.current?.focus();
                else if (nextErrors.maxGuests) guestsRef.current?.focus();
            });
            return;
        }
        await creation.flushDraft();
        router.push('/events/create/settings');
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }} edges={['top', 'bottom']}>
            <CreateEventHeader saveStatus={creation.saveStatus} />
            <KeyboardAwareScrollView contentContainerStyle={{ paddingHorizontal: horizontalPadding, paddingBottom: 120 }} keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
                <WizardProgress currentStep={3} />
                <Text className="text-2xl font-extrabold text-[#1A1A1A] mt-3">Data, vagas e valor</Text>
                <Text className="text-sm text-gray-500 mt-1 mb-5">Defina horários claros para que ninguém fique com dúvidas.</Text>

                <View className="flex-row gap-3 mb-2">
                    <InputField label="VALOR POR PESSOA" error={errors.price}>
                        <View className="flex-row items-center px-3">
                            <Text className="text-base font-bold text-emerald-700 mr-2">R$</Text>
                            <TextInput
                                ref={priceRef}
                                className="flex-1 py-4 text-base text-[#1A1A1A]"
                                placeholder="0,00"
                                keyboardType="decimal-pad"
                                value={creation.data.details.pricePerGuest}
                                onChangeText={(value) => creation.updateDetails({ pricePerGuest: formatEventPriceInput(value) })}
                            />
                        </View>
                    </InputField>
                    <InputField label="VAGAS" error={errors.maxGuests}>
                        <TextInput
                            ref={guestsRef}
                            className="px-4 py-4 text-base text-[#1A1A1A]"
                            placeholder="Ex: 8"
                            keyboardType="number-pad"
                            value={creation.data.details.maxGuests}
                            onChangeText={(maxGuests) => creation.updateDetails({ maxGuests: maxGuests.replace(/\D/g, '') })}
                        />
                    </InputField>
                </View>

                {Number.isFinite(price) && price > 0 && (
                    <View className="bg-emerald-50 border border-emerald-200 p-4 mb-5" style={{ borderRadius: 8 }}>
                        <Text className="text-sm font-bold text-emerald-900">Estimativa por inscrição</Text>
                        <View className="flex-row justify-between mt-2"><Text className="text-sm text-emerald-800">Taxa Wellcome ({platformFeePercentage}%)</Text><Text className="text-sm text-emerald-900">R$ {(price * feeRate).toFixed(2).replace('.', ',')}</Text></View>
                        <View className="flex-row justify-between mt-1"><Text className="text-sm font-bold text-emerald-900">Você recebe</Text><Text className="text-sm font-bold text-emerald-900">R$ {estimatedNet.toFixed(2).replace('.', ',')}</Text></View>
                        <Text className="text-xs text-emerald-700 mt-2">A taxa do processador pode variar conforme o meio de pagamento.</Text>
                    </View>
                )}

                <Text className="text-xs text-gray-600 font-bold mb-2">DATA DO EVENTO</Text>
                <PickerButton icon="calendar-outline" label={date ? formatDate(date) : 'Selecionar data'} active={!!date} onPress={() => openPicker('date')} />
                {errors.eventDate && <ErrorText>{errors.eventDate}</ErrorText>}

                <View className="flex-row gap-3 mt-3">
                    <InputField label="INÍCIO" error={errors.eventDate}>
                        <TouchableOpacity className="px-4 py-4" onPress={() => openPicker('start')} disabled={!date}>
                            <Text className={`text-lg font-bold ${date ? 'text-[#1A1A1A]' : 'text-gray-300'}`}>{date ? formatTime(date) : '--:--'}</Text>
                        </TouchableOpacity>
                    </InputField>
                    <InputField label="TÉRMINO" error={errors.endTime}>
                        <TouchableOpacity className="px-4 py-4" onPress={() => openPicker('end')} disabled={!date}>
                            <Text className={`text-lg font-bold ${endTime ? 'text-[#1A1A1A]' : 'text-gray-300'}`}>{endTime ? formatTime(endTime) : '--:--'}</Text>
                        </TouchableOpacity>
                    </InputField>
                </View>
                {!!duration && <Text className="text-xs text-gray-500 text-center mb-5">Duração estimada: {duration}</Text>}

                <View className="flex-row items-center justify-between mt-2 mb-2">
                    <Text className="text-xs text-gray-600 font-bold">PRAZO PARA INSCRIÇÕES</Text>
                    {registrationDeadline && <TouchableOpacity onPress={() => creation.updateDetails({ registrationDeadline: null })}><Text className="text-xs text-red-600 font-bold">Remover</Text></TouchableOpacity>}
                </View>
                <View className="flex-row gap-3">
                    <View className="flex-1"><PickerButton icon="calendar-outline" label={registrationDeadline ? formatDate(registrationDeadline) : 'Definir data'} active={!!registrationDeadline} onPress={() => openPicker('deadlineDate')} /></View>
                    <View className="w-[34%]"><PickerButton icon="time-outline" label={registrationDeadline ? formatTime(registrationDeadline) : '--:--'} active={!!registrationDeadline} onPress={() => registrationDeadline ? openPicker('deadlineTime') : openPicker('deadlineDate')} /></View>
                </View>
                {errors.reservationDeadline && <ErrorText>{errors.reservationDeadline}</ErrorText>}
            </KeyboardAwareScrollView>

            <WellcomeBottomBar>
                <WellcomeButton label="Continuar" onPress={() => void handleNext()} />
            </WellcomeBottomBar>

            {Platform.OS === 'ios' && activePicker && (
                <WellcomeDatePickerSheet
                    visible
                    title={pickerTitle(activePicker)}
                    value={pickerValue}
                    mode={pickerMode(activePicker)}
                    minimumDate={activePicker === 'date' || activePicker === 'deadlineDate' ? new Date() : undefined}
                    reducedMotion={reducedMotion}
                    onChange={setPickerValue}
                    onCancel={() => setActivePicker(null)}
                    onConfirm={() => applyPicker(activePicker, pickerValue)}
                />
            )}
            {Platform.OS === 'android' && activePicker && (
                <DateTimePicker
                    value={pickerValue}
                    mode={pickerMode(activePicker)}
                    display="default"
                    is24Hour
                    minimumDate={activePicker === 'date' || activePicker === 'deadlineDate' ? new Date() : undefined}
                    onChange={(event, value) => {
                        if (event.type === 'dismissed' || !value) setActivePicker(null);
                        else applyPicker(activePicker, value);
                    }}
                />
            )}
        </SafeAreaView>
    );
}

function InputField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return <WellcomeField label={label} error={error} className="flex-1">{children}</WellcomeField>;
}
function PickerButton({ icon, label, active, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; active: boolean; onPress: () => void }) {
    return <TouchableOpacity className={`flex-row items-center border px-4 py-4 ${active ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-white'}`} style={{ borderRadius: 8 }} onPress={onPress}><Ionicons name={icon} size={18} color={active ? '#C45D22' : '#73787E'} /><Text className={`flex-1 ml-2 font-semibold ${active ? 'text-[#1A1A1A]' : 'text-gray-500'}`} numberOfLines={1}>{label}</Text></TouchableOpacity>;
}
function ErrorText({ children }: { children: React.ReactNode }) { return <Text className="text-xs text-red-600 mt-1 mb-2" accessibilityRole="alert">{children}</Text>; }
function formatDate(date: Date) { return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }); }
function formatTime(date: Date) { return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
function pickerMode(kind: Exclude<PickerKind, null>): 'date' | 'time' { return kind === 'date' || kind === 'deadlineDate' ? 'date' : 'time'; }
function pickerTitle(kind: Exclude<PickerKind, null>) { return ({ date: 'Data do evento', start: 'Horário de início', end: 'Horário de término', deadlineDate: 'Data limite', deadlineTime: 'Horário limite' })[kind]; }
