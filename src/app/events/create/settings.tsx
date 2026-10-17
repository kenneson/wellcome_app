import { CreateEventHeader } from '@/components/ui/CreateEventHeader';
import { EventPublishedModal } from '@/components/ui/EventPublishedModal';
import { BrandSheet, WellcomeBottomBar, WellcomeButton } from '@/components/ui/wellcome';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { SelectionCard } from '@/components/ui/SelectionCard';
import { WizardProgress } from '@/components/ui/WizardProgress';
import { firstInvalidStep, validateCompleteEvent } from '@/features/create-event/model/eventCreationValidation';
import { EVENT_CREATION_RETURN_ROUTE } from '@/features/create-event/model/payoutReturn';
import { EventDraftApiError } from '@/services/api/EventDraftService';
import { useEventCreation } from '@/shared/context/EventCreationContext';
import { BorderRadius, Palette, Spacing } from '@/shared/constants/theme';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';

const STEP_ROUTES = ['/events/create', '/events/create/menu', '/events/create/location', '/events/create/details'] as const;

export default function EventCreateReview() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const horizontalPadding = width < 375 ? 16 : width >= 414 ? 24 : 20;
    const creation = useEventCreation();
    const { setCurrentStep } = creation;
    const [submitting, setSubmitting] = useState(false);
    const [newQuestion, setNewQuestion] = useState('');
    const [isRequired, setIsRequired] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [publishedEvent, setPublishedEvent] = useState<{ id: string; title: string } | null>(null);

    useEffect(() => setCurrentStep(4), [setCurrentStep]);

    const addQuestion = () => {
        const question = newQuestion.trim();
        if (question.length < 5 || creation.data.details.questions.length >= 5) return;
        creation.addQuestion({ question, questionType: 'TEXT', required: isRequired, options: [] });
        setNewQuestion('');
        setIsRequired(false);
    };

    const goToFirstError = (fieldErrors: Record<string, string>) => {
        const step = firstInvalidStep(fieldErrors);
        if (step < 4) router.replace(STEP_ROUTES[step] as any);
    };

    const openPayoutSetup = (path: '/profile/pix-key' | '/kyc') => {
        router.push({
            pathname: path,
            params: {
                returnTo: EVENT_CREATION_RETURN_ROUTE,
                draftId: creation.draftId ?? '',
            },
        } as any);
    };

    const goToFeed = () => {
        setPublishedEvent(null);
        router.replace('/(tabs)');
    };

    const viewPublishedEvent = () => {
        if (!publishedEvent) return;
        const eventId = publishedEvent.id;
        setPublishedEvent(null);
        router.replace(`/events/${eventId}` as any);
    };

    const handlePublish = async () => {
        if (submitting) return;
        const localErrors = validateCompleteEvent(creation.data);
        setErrors(localErrors);
        if (Object.keys(localErrors).length > 0) {
            Alert.alert('Revise o evento', Object.values(localErrors)[0], [
                { text: 'Agora não', style: 'cancel' },
                { text: 'Corrigir', onPress: () => goToFirstError(localErrors) },
            ]);
            return;
        }

        setSubmitting(true);
        try {
            const event = await creation.publishDraft();
            setPublishedEvent({ id: event.id, title: event.title });
        } catch (error: any) {
            const apiError = error as EventDraftApiError;
            setErrors(apiError.fieldErrors ?? {});
            if (apiError.code === 'HOST_PAYOUT_SETUP_REQUIRED') {
                const missingPix = !!apiError.fieldErrors?.pixKey;
                Alert.alert('Configure o recebimento', apiError.message, [
                    { text: 'Agora não', style: 'cancel' },
                    { text: missingPix ? 'Cadastrar Pix' : 'Verificar identidade', onPress: () => openPayoutSetup(missingPix ? '/profile/pix-key' : '/kyc') },
                ]);
            } else if (apiError.code === 'INVALID_EVENT') {
                Alert.alert('Revise o evento', apiError.message, [{ text: 'Corrigir', onPress: () => goToFirstError(apiError.fieldErrors) }]);
            } else {
                Alert.alert('Não foi possível publicar', apiError.message || 'Tente novamente em instantes.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const eventDate = creation.data.details.date;
    return (
        <View style={styles.screen}>
            <CreateEventHeader title="Revisar evento" saveStatus={creation.saveStatus} />
            <BrandSheet>
                <KeyboardAwareScrollView contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]} keyboardShouldPersistTaps="handled" style={styles.flex}>
                    <WizardProgress currentStep={4} />
                    <Text style={styles.title}>Tudo pronto?</Text>
                    <Text style={styles.subtitle}>Confira como seu evento será apresentado antes de publicar.</Text>

                    <View style={styles.previewCard}>
                        {creation.data.details.coverImage && <Image source={{ uri: creation.data.details.coverImage }} style={styles.previewImage} contentFit="cover" />}
                        <View style={styles.previewBody}>
                            <Text style={styles.previewTitle}>{creation.data.details.title || 'Evento sem título'}</Text>
                            <Text style={styles.previewDescription}>{creation.data.details.description}</Text>
                            <SummaryRow icon="calendar-outline" text={eventDate ? eventDate.toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }) : 'Data pendente'} />
                            <SummaryRow icon="location-outline" text={[creation.data.location.city, creation.data.location.state].filter(Boolean).join(' - ') || 'Local pendente'} />
                            <SummaryRow icon="restaurant-outline" text={`${creation.data.dishes.length} ${creation.data.dishes.length === 1 ? 'item no cardápio' : 'itens no cardápio'}`} />
                            <SummaryRow icon="people-outline" text={`${creation.data.details.maxGuests || 0} vagas · R$ ${creation.data.details.pricePerGuest || '0,00'} por pessoa`} />
                        </View>
                    </View>

                    <ReviewSection title="Experiência" onEdit={() => router.push('/events/create')}>
                        <ReviewLine label="Tipo" value={creation.data.eventType || 'Pendente'} />
                        <ReviewLine label="Culinárias" value={creation.data.cuisineTypes.join(', ') || 'Pendentes'} />
                    </ReviewSection>

                    <ReviewSection title="Cardápio" onEdit={() => router.push('/events/create/menu')}>
                        {creation.data.dishes.map((dish, index) => (
                            <View key={dish.id} style={styles.dishRow}>
                                <Text style={styles.dishName}>{index + 1}. {dish.name || 'Prato pendente'}</Text>
                                <Text style={styles.dishMeta}>{dish.category.replace('_', ' ').toLocaleLowerCase('pt-BR')}{dish.description ? ` · ${dish.description}` : ''}</Text>
                            </View>
                        ))}
                        <ReviewLine label="Serviço" value={creation.data.isServedInSequence ? 'Em sequência' : 'Livre'} />
                    </ReviewSection>

                    <ReviewSection title="Local" onEdit={() => router.push('/events/create/location')}>
                        <Text style={styles.addressText}>{creation.data.location.address || 'Endereço pendente'}</Text>
                        <Text style={styles.addressMeta}>{[creation.data.location.city, creation.data.location.state].filter(Boolean).join(' - ') || 'Cidade pendente'}</Text>
                        <View style={[styles.pinPill, creation.data.location.confirmed ? styles.pinPillOk : styles.pinPillPending]}>
                            <Ionicons name={creation.data.location.confirmed ? 'checkmark-circle' : 'alert-circle'} size={14} color={creation.data.location.confirmed ? Palette.green : Palette.orangeDarker} />
                            <Text style={[styles.pinText, { color: creation.data.location.confirmed ? Palette.green : Palette.orangeDarker }]}>{creation.data.location.confirmed ? 'PINO CONFIRMADO' : 'PINO PENDENTE'}</Text>
                        </View>
                    </ReviewSection>

                    <ReviewSection title="Data e valor" onEdit={() => router.push('/events/create/details')}>
                        <ReviewLine label="Início" value={eventDate ? eventDate.toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }) : 'Pendente'} />
                        <ReviewLine label="Término" value={creation.data.details.endTime ? creation.data.details.endTime.toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }) : 'Pendente'} />
                        <ReviewLine label="Inscrições até" value={creation.data.details.registrationDeadline ? creation.data.details.registrationDeadline.toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }) : 'Até o início'} />
                        <ReviewLine label="Vagas" value={creation.data.details.maxGuests || 'Pendente'} />
                        <ReviewLine label="Valor por pessoa" value={`R$ ${creation.data.details.pricePerGuest || '0,00'}`} />
                    </ReviewSection>

                    <Text style={[styles.sectionTitle, styles.accessTitle]}>Como as pessoas participam?</Text>
                    <View style={styles.accessOptions}>
                        <SelectionCard
                            label="Inscrição imediata"
                            description="Após o pagamento, a participação é confirmada automaticamente."
                            selected={creation.data.details.accessType === 'OPEN'}
                            onPress={() => creation.setAccessType('OPEN')}
                        />
                        <SelectionCard
                            label="Requer minha aprovação"
                            description="Você analisa a solicitação antes da confirmação e do pagamento."
                            selected={creation.data.details.accessType === 'OPEN_WITH_APPROVAL'}
                            onPress={() => creation.setAccessType('OPEN_WITH_APPROVAL')}
                        />
                    </View>

                    <View style={styles.questionsHeader}>
                        <View style={styles.flex}>
                            <Text style={styles.sectionTitle}>Perguntas aos convidados</Text>
                            <Text style={styles.sectionSubtitle}>Opcional, até cinco perguntas.</Text>
                        </View>
                        <Text style={styles.counter}>{creation.data.details.questions.length}/5</Text>
                    </View>

                    {creation.data.details.questions.map((question, index) => (
                        <View key={`${question.question}-${index}`} style={styles.questionCard}>
                            <View style={styles.flex}>
                                <Text style={styles.questionText}>{question.question}</Text>
                                <Text style={styles.questionMeta}>{question.required ? 'Obrigatória' : 'Opcional'}</Text>
                            </View>
                            <TouchableOpacity style={styles.iconButton} onPress={() => creation.removeQuestion(index)} accessibilityRole="button" accessibilityLabel="Remover pergunta">
                                <Ionicons name="trash-outline" size={20} color={Palette.danger} />
                            </TouchableOpacity>
                        </View>
                    ))}

                    <View style={styles.composer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Ex: Você possui alguma alergia?"
                            placeholderTextColor={Palette.subtle}
                            value={newQuestion}
                            maxLength={180}
                            onChangeText={setNewQuestion}
                        />
                        <View style={styles.composerFooter}>
                            <View style={styles.switchRow}>
                                <Switch value={isRequired} onValueChange={setIsRequired} trackColor={{ false: Palette.track, true: Palette.orange }} />
                                <Text style={styles.switchLabel}>Obrigatória</Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.addButton, newQuestion.trim().length < 5 && styles.addButtonDisabled]}
                                disabled={newQuestion.trim().length < 5}
                                onPress={addQuestion}
                                accessibilityRole="button"
                                accessibilityState={{ disabled: newQuestion.trim().length < 5 }}
                            >
                                <Text style={styles.addButtonText}>Adicionar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {!!Object.keys(errors).length && (
                        <TouchableOpacity style={styles.errorCard} onPress={() => goToFirstError(errors)} accessibilityRole="button">
                            <Ionicons name="alert-circle" size={20} color={Palette.danger} />
                            <View style={styles.flex}>
                                <Text style={styles.errorTitle}>Há {Object.keys(errors).length} pendência(s) para revisar</Text>
                                <Text style={styles.errorBody}>Toque para voltar ao primeiro campo.</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                </KeyboardAwareScrollView>
            </BrandSheet>

            <WellcomeBottomBar>
                <WellcomeButton
                    label={submitting ? 'Publicando...' : 'Publicar evento'}
                    loading={submitting}
                    disabled={submitting}
                    onPress={() => void handlePublish()}
                />
            </WellcomeBottomBar>

            <EventPublishedModal
                visible={publishedEvent !== null}
                eventTitle={publishedEvent?.title}
                onGoToFeed={goToFeed}
                onViewEvent={viewPublishedEvent}
            />
        </View>
    );
}

function SummaryRow({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }) {
    return (
        <View style={styles.summaryRow}>
            <Ionicons name={icon} size={17} color={Palette.muted} />
            <Text style={styles.summaryText}>{text}</Text>
        </View>
    );
}

function ReviewSection({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
    return (
        <View style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
                <Text style={styles.reviewTitle}>{title}</Text>
                <TouchableOpacity style={styles.editButton} onPress={onEdit} accessibilityRole="button" accessibilityLabel={`Editar ${title}`}>
                    <Ionicons name="pencil" size={18} color={Palette.orangeDeep} />
                </TouchableOpacity>
            </View>
            {children}
        </View>
    );
}

function ReviewLine({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.reviewLine}>
            <Text style={styles.reviewLabel}>{label}</Text>
            <Text style={styles.reviewValue}>{value}</Text>
        </View>
    );
}

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
        paddingBottom: 130,
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
    previewCard: {
        overflow: 'hidden',
        marginBottom: Spacing.lg,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        backgroundColor: Palette.surface,
    },
    previewImage: {
        width: '100%',
        height: 170,
    },
    previewBody: {
        padding: Spacing.lg,
    },
    previewTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: Palette.ink,
    },
    previewDescription: {
        fontSize: 14,
        lineHeight: 21,
        color: Palette.inkSoft,
        marginTop: Spacing.sm,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginTop: Spacing.md,
    },
    summaryText: {
        flex: 1,
        fontSize: 14,
        color: Palette.inkSoft,
    },
    reviewCard: {
        padding: 14,
        marginBottom: Spacing.md,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        backgroundColor: Palette.surface,
    },
    reviewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.xs,
    },
    reviewTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: Palette.ink,
    },
    editButton: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.full,
        backgroundColor: Palette.orangeSoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    reviewLine: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: Spacing.lg,
        paddingVertical: 6,
    },
    reviewLabel: {
        fontSize: 14,
        color: Palette.muted,
    },
    reviewValue: {
        flex: 1,
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'right',
        color: Palette.ink,
    },
    dishRow: {
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Palette.lineSoft,
    },
    dishName: {
        fontSize: 14,
        fontWeight: '800',
        color: Palette.ink,
    },
    dishMeta: {
        fontSize: 12,
        color: Palette.muted,
        marginTop: 2,
    },
    addressText: {
        fontSize: 14,
        lineHeight: 21,
        color: Palette.ink,
    },
    addressMeta: {
        fontSize: 12,
        color: Palette.muted,
        marginTop: Spacing.xs,
    },
    pinPill: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: Spacing.sm,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: BorderRadius.full,
    },
    pinPillOk: {
        backgroundColor: Palette.greenSoft,
    },
    pinPillPending: {
        backgroundColor: Palette.orangeSoft,
    },
    pinText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: Palette.ink,
    },
    accessTitle: {
        marginTop: Spacing.md,
        marginBottom: Spacing.md,
    },
    sectionSubtitle: {
        fontSize: 14,
        lineHeight: 21,
        color: Palette.inkSoft,
        marginTop: Spacing.xs,
    },
    accessOptions: {
        gap: Spacing.md,
        marginBottom: Spacing.xxl,
    },
    questionsHeader: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
    },
    counter: {
        fontSize: 12,
        fontWeight: '800',
        color: Palette.muted,
    },
    questionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 14,
        paddingRight: Spacing.xs,
        paddingVertical: Spacing.xs,
        marginBottom: Spacing.sm,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        backgroundColor: Palette.surface,
    },
    questionText: {
        fontSize: 14,
        fontWeight: '800',
        color: Palette.ink,
    },
    questionMeta: {
        fontSize: 12,
        color: Palette.muted,
        marginTop: 2,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    composer: {
        padding: 14,
        marginBottom: Spacing.xl,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        backgroundColor: Palette.surface,
    },
    input: {
        minHeight: 48,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        fontSize: 15,
        color: Palette.ink,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Palette.line,
        backgroundColor: Palette.surface,
    },
    composerFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: Spacing.md,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    switchLabel: {
        fontSize: 14,
        color: Palette.inkSoft,
    },
    addButton: {
        minHeight: 44,
        paddingHorizontal: Spacing.xl,
        borderRadius: BorderRadius.full,
        backgroundColor: Palette.orange,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButtonDisabled: {
        opacity: 0.4,
    },
    addButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
    },
    errorCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.md,
        padding: 14,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Palette.dangerLine,
        backgroundColor: Palette.surface,
    },
    errorTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: Palette.danger,
    },
    errorBody: {
        fontSize: 13,
        lineHeight: 19,
        color: Palette.inkSoft,
        marginTop: 2,
    },
});
