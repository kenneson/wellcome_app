import { CreateEventHeader } from '@/components/ui/CreateEventHeader';
import { BrandSheet, WellcomeBottomBar, WellcomeButton, WellcomeDatePickerSheet, WellcomeField } from '@/components/ui/wellcome';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { WizardProgress } from '@/components/ui/WizardProgress';
import { validateEventStep } from '@/features/create-event/model/eventCreationValidation';
import { eventService } from '@/services/api/EventService';
import { formatEventPriceInput, parseEventPrice } from '@/shared/config/payments';
import { useEventCreation } from '@/shared/context/EventCreationContext';
import { BorderRadius, Palette, Spacing } from '@/shared/constants/theme';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';

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
        <View style={styles.screen}>
            <CreateEventHeader saveStatus={creation.saveStatus} />
            <BrandSheet>
                <KeyboardAwareScrollView contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]} keyboardShouldPersistTaps="handled" style={styles.flex}>
                    <WizardProgress currentStep={3} />
                    <Text style={styles.title}>Data, vagas e valor</Text>
                    <Text style={styles.subtitle}>Defina horários claros para que ninguém fique com dúvidas.</Text>

                    <View style={styles.row}>
                        <InputField label="VALOR POR PESSOA" error={errors.price}>
                            <View style={styles.priceRow}>
                                <Text style={styles.currency}>R$</Text>
                                <TextInput
                                    ref={priceRef}
                                    style={[styles.input, styles.priceInput]}
                                    placeholder="0,00"
                                    placeholderTextColor={Palette.subtle}
                                    keyboardType="decimal-pad"
                                    value={creation.data.details.pricePerGuest}
                                    onChangeText={(value) => creation.updateDetails({ pricePerGuest: formatEventPriceInput(value) })}
                                />
                            </View>
                        </InputField>
                        <InputField label="VAGAS" error={errors.maxGuests}>
                            <TextInput
                                ref={guestsRef}
                                style={styles.input}
                                placeholder="Ex: 8"
                                placeholderTextColor={Palette.subtle}
                                keyboardType="number-pad"
                                value={creation.data.details.maxGuests}
                                onChangeText={(maxGuests) => creation.updateDetails({ maxGuests: maxGuests.replace(/\D/g, '') })}
                            />
                        </InputField>
                    </View>

                    {Number.isFinite(price) && price > 0 && (
                        <View style={styles.estimateCard}>
                            <Text style={styles.estimateTitle}>Estimativa por inscrição</Text>
                            <View style={styles.estimateRow}>
                                <Text style={styles.estimateLabel}>Taxa Wellcome ({platformFeePercentage}%)</Text>
                                <Text style={styles.estimateLabel}>R$ {(price * feeRate).toFixed(2).replace('.', ',')}</Text>
                            </View>
                            <View style={styles.estimateRow}>
                                <Text style={styles.estimateStrong}>Você recebe</Text>
                                <Text style={styles.estimateStrong}>R$ {estimatedNet.toFixed(2).replace('.', ',')}</Text>
                            </View>
                            <Text style={styles.estimateNote}>A taxa do processador pode variar conforme o meio de pagamento.</Text>
                        </View>
                    )}

                    <Text style={styles.sectionLabel}>DATA DO EVENTO</Text>
                    <PickerButton icon="calendar-outline" label={date ? formatDate(date) : 'Selecionar data'} active={!!date} onPress={() => openPicker('date')} />
                    {errors.eventDate && <ErrorText>{errors.eventDate}</ErrorText>}

                    <View style={[styles.row, styles.timeRow]}>
                        <InputField label="INÍCIO" error={errors.eventDate}>
                            <TouchableOpacity style={styles.timeButton} onPress={() => openPicker('start')} disabled={!date} accessibilityRole="button" accessibilityLabel="Horário de início">
                                <Text style={[styles.timeText, !date && styles.timeTextEmpty]}>{date ? formatTime(date) : '--:--'}</Text>
                            </TouchableOpacity>
                        </InputField>
                        <InputField label="TÉRMINO" error={errors.endTime}>
                            <TouchableOpacity style={styles.timeButton} onPress={() => openPicker('end')} disabled={!date} accessibilityRole="button" accessibilityLabel="Horário de término">
                                <Text style={[styles.timeText, !endTime && styles.timeTextEmpty]}>{endTime ? formatTime(endTime) : '--:--'}</Text>
                            </TouchableOpacity>
                        </InputField>
                    </View>
                    {!!duration && <Text style={styles.duration}>Duração estimada: {duration}</Text>}

                    <View style={styles.deadlineHeader}>
                        <Text style={[styles.sectionLabel, styles.noMargin]}>PRAZO PARA INSCRIÇÕES</Text>
                        {registrationDeadline && (
                            <TouchableOpacity onPress={() => creation.updateDetails({ registrationDeadline: null })} accessibilityRole="button" hitSlop={8}>
                                <Text style={styles.removeText}>Remover</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <View style={styles.row}>
                        <View style={styles.flex}><PickerButton icon="calendar-outline" label={registrationDeadline ? formatDate(registrationDeadline) : 'Definir data'} active={!!registrationDeadline} onPress={() => openPicker('deadlineDate')} /></View>
                        <View style={styles.deadlineTime}><PickerButton icon="time-outline" label={registrationDeadline ? formatTime(registrationDeadline) : '--:--'} active={!!registrationDeadline} onPress={() => registrationDeadline ? openPicker('deadlineTime') : openPicker('deadlineDate')} /></View>
                    </View>
                    {errors.reservationDeadline && <ErrorText>{errors.reservationDeadline}</ErrorText>}
                </KeyboardAwareScrollView>
            </BrandSheet>

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
        </View>
    );
}

function InputField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return <WellcomeField label={label} error={error} className="flex-1">{children}</WellcomeField>;
}
function PickerButton({ icon, label, active, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; active: boolean; onPress: () => void }) {
    return (
        <TouchableOpacity style={[styles.pickerButton, active && styles.pickerButtonActive]} onPress={onPress} accessibilityRole="button">
            <Ionicons name={icon} size={18} color={active ? Palette.orangeDeep : Palette.muted} />
            <Text style={[styles.pickerText, active && styles.pickerTextActive]} numberOfLines={1}>{label}</Text>
        </TouchableOpacity>
    );
}
function ErrorText({ children }: { children: React.ReactNode }) { return <Text style={styles.error} accessibilityRole="alert">{children}</Text>; }
function formatDate(date: Date) { return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }); }
function formatTime(date: Date) { return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
function pickerMode(kind: Exclude<PickerKind, null>): 'date' | 'time' { return kind === 'date' || kind === 'deadlineDate' ? 'date' : 'time'; }
function pickerTitle(kind: Exclude<PickerKind, null>) { return ({ date: 'Data do evento', start: 'Horário de início', end: 'Horário de término', deadlineDate: 'Data limite', deadlineTime: 'Horário limite' })[kind]; }

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Palette.paper,
    },
    flex: {
        flex: 1,
    },
    content: {
        paddingTop: Spacing.xl,
        paddingBottom: 120,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.3,
        color: Palette.ink,
        marginTop: Spacing.xl,
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 21,
        color: Palette.inkSoft,
        marginTop: Spacing.xs,
        marginBottom: Spacing.xl,
    },
    row: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    timeRow: {
        marginTop: Spacing.md,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: Spacing.md,
    },
    currency: {
        fontSize: 15,
        fontWeight: '800',
        color: Palette.green,
        marginRight: Spacing.xs,
    },
    input: {
        minHeight: 48,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        fontSize: 15,
        color: Palette.ink,
    },
    priceInput: {
        flex: 1,
        paddingLeft: Spacing.xs,
    },
    estimateCard: {
        padding: 14,
        marginBottom: Spacing.xl,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        backgroundColor: Palette.greenSoft,
    },
    estimateTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: Palette.green,
    },
    estimateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    estimateLabel: {
        fontSize: 14,
        color: Palette.inkSoft,
    },
    estimateStrong: {
        fontSize: 14,
        fontWeight: '800',
        color: Palette.green,
    },
    estimateNote: {
        fontSize: 12,
        lineHeight: 18,
        color: Palette.inkSoft,
        marginTop: Spacing.sm,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.8,
        color: Palette.inkSoft,
        marginBottom: Spacing.sm,
    },
    noMargin: {
        marginBottom: 0,
    },
    timeButton: {
        minHeight: 48,
        justifyContent: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    timeText: {
        fontSize: 18,
        fontWeight: '800',
        color: Palette.ink,
    },
    timeTextEmpty: {
        color: Palette.subtle,
    },
    duration: {
        fontSize: 12,
        color: Palette.muted,
        textAlign: 'center',
        marginBottom: Spacing.xl,
    },
    deadlineHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    removeText: {
        fontSize: 12,
        fontWeight: '800',
        color: Palette.danger,
    },
    deadlineTime: {
        width: '34%',
    },
    pickerButton: {
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Palette.line,
        backgroundColor: Palette.surface,
    },
    pickerButtonActive: {
        borderColor: Palette.orange,
        backgroundColor: Palette.orangeSoft,
    },
    pickerText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '700',
        color: Palette.muted,
    },
    pickerTextActive: {
        color: Palette.ink,
    },
    error: {
        fontSize: 12,
        color: Palette.danger,
        marginTop: Spacing.xs,
        marginBottom: Spacing.sm,
    },
});
