import { registrationService } from '@/services/api/RegistrationService';
import { eventService } from '@/services/api/EventService';
import { supabase } from '@/shared/lib/supabase';
import { isEventRegistrationClosed } from '@/shared/lib/eventAvailability';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import { BrandSheet, BrandStackHeader } from '@/components/ui/wellcome';
import { BorderRadius, Elevation, Palette, Spacing } from '@/shared/constants/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { friendlyErrorMessage } from '@/shared/lib/errorMessages';

export default function JoinEventScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [event, setEvent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [answers, setAnswers] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        // eslint-disable-next-line react-hooks/immutability -- function declaration is hoisted
        if (id) fetchEventDetails();
    }, [id]);

    async function fetchEventDetails() {
        try {
            setLoading(true);
            const data = await eventService.getEventById(String(id));

            if (isEventRegistrationClosed(data)) {
                Alert.alert(
                    'Inscrições encerradas',
                    'O prazo para participar deste evento terminou.',
                    [{ text: 'OK', onPress: () => router.replace(`/events/${id}`) }]
                );
                return;
            }

            // Sort questions by order
            if (data.questions) {
                data.questions.sort((a: any, b: any) => a.order - b.order);
            }

            setEvent(data);
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível carregar os dados do evento.');
            router.back();
        } finally {
            setLoading(false);
        }
    }

    const handleAnswerChange = (questionId: string, text: string) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: text
        }));
    };

    const validateAnswers = () => {
        if (!event?.questions) return true;

        for (const q of event.questions) {
            if (q.required && (!answers[q.id] || !answers[q.id].trim())) {
                Alert.alert('Atenção', `A pergunta "${q.question}" é obrigatória.`);
                return false;
            }
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateAnswers()) return;

        setSubmitting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                Alert.alert('Erro', 'Sessão expirada. Faça login novamente.');
                return;
            }

            const formattedAnswers = Object.keys(answers).map(qId => ({
                questionId: qId,
                answer: answers[qId]
            }));

            const registration = await registrationService.createBooking({
                eventId: event.id,
                userId: session.user.id,
                answers: formattedAnswers
            });

            // Se o evento tem preço, redirecionar para pagamento PIX
            const eventPrice = Number(event.price || 0);
            const requiresHostApproval = event.requiresApproval === true
                || event.accessType === 'OPEN_WITH_APPROVAL';

            if (registration.status === 'WAITLIST') {
                Alert.alert(
                    'Você entrou na lista de espera',
                    'Avisaremos quando uma vaga for liberada. Depois, você paga para reservar a vaga e aguarda a aprovação do anfitrião, quando exigida.',
                    [{ text: 'OK', onPress: () => router.replace(`/events/${event.id}`) }]
                );
                return;
            }

            if (registration.status === 'PENDING' && requiresHostApproval && eventPrice <= 0) {
                Alert.alert(
                    'Solicitação enviada',
                    'O anfitrião analisará sua solicitação. Avisaremos quando houver uma resposta.',
                    [{ text: 'OK', onPress: () => router.replace(`/events/${event.id}`) }]
                );
                return;
            }

            if (eventPrice > 0 && registration.id) {
                router.replace(`/events/${event.id}/payment?bookingId=${registration.id}`);
                return;
            }

            // Handle specific statuses
            if (registration.status === 'PENDING') {
                Alert.alert(
                    'Solicitação Enviada',
                    'Sua inscrição foi enviada e aguarda aprovação do anfitrião. Você será notificado assim que houver uma resposta.',
                    [{ text: 'OK', onPress: () => router.push(`/events/${event.id}`) }]
                );
            } else {
                Alert.alert(
                    'Inscrição Confirmada!',
                    'Sua presença foi confirmada no evento!',
                    [{ text: 'OK', onPress: () => router.push(`/events/${event.id}`) }]
                );
            }

        } catch (error: any) {
            // Handle 409 specifically if message matches
            if (error.message && (error.message.includes('already registered') || error.message.includes('409'))) {
                Alert.alert(
                    'Já Solicitado',
                    'Você já enviou uma solicitação para este evento.',
                    [{ text: 'OK', onPress: () => router.push(`/events/${event.id}`) }]
                );
            } else {
                Alert.alert('Erro', friendlyErrorMessage(error, 'Falha ao solicitar inscrição.'));
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.screen}>
                <BrandStackHeader eyebrow="INSCRIÇÃO" title="Solicitar inscrição" backIcon="close" />
                <BrandSheet>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={Palette.orange} />
                    </View>
                </BrandSheet>
            </View>
        );
    }

    if (!event) return null;

    const isPaid = Number(event.price) > 0;

    return (
        <View style={styles.screen}>
            <BrandStackHeader eyebrow="INSCRIÇÃO" title="Solicitar inscrição" backIcon="close" />

            <BrandSheet>
                <KeyboardAwareScrollView
                    enableOnAndroid={true}
                    extraScrollHeight={40}
                    extraHeight={120}
                    enableResetScrollToCoords={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.content}
                    style={{ flex: 1 }}
                >
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.subtitle}>
                        {event.questions && event.questions.length > 0
                            ? 'Por favor, responda às perguntas abaixo para concluir sua solicitação.'
                            : 'Confirme sua solicitação abaixo.'}
                    </Text>

                    {isPaid && (
                        <View style={styles.notice}>
                            <View style={styles.noticeHeader}>
                                <Ionicons name="card-outline" size={18} color={Palette.orangeDeep} />
                                <Text style={styles.noticeTitle}>Pagamento na inscrição</Text>
                            </View>
                            <Text style={styles.noticeBody}>
                                {event.requiresApproval || event.accessType === 'OPEN_WITH_APPROVAL'
                                    ? 'Você paga primeiro. Após a confirmação do pagamento, sua vaga fica reservada enquanto o anfitrião analisa a inscrição. O ingresso é liberado com a aprovação. Em caso de recusa, o valor pago será devolvido integralmente.'
                                    : 'Conclua o pagamento para confirmar sua participação e receber o ingresso.'}
                            </Text>
                        </View>
                    )}
                    {event.questions?.map((q: any) => (
                        <View key={q.id} style={styles.questionContainer}>
                            <Text style={styles.questionLabel}>
                                {q.question} {q.required && <Text style={styles.asterisk}>*</Text>}
                            </Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Sua resposta..."
                                placeholderTextColor={Palette.subtle}
                                value={answers[q.id] || ''}
                                onChangeText={(text) => handleAnswerChange(q.id, text)}
                                multiline
                                accessibilityLabel={q.question}
                            />
                        </View>
                    ))}

                    <View style={{ height: 100 }} />
                </KeyboardAwareScrollView>
            </BrandSheet>

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
                <TouchableOpacity
                    style={[styles.button, submitting && styles.disabledButton]}
                    onPress={handleSubmit}
                    disabled={submitting}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: submitting }}
                >
                    {submitting ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.buttonText}>{isPaid ? 'Inscrever-se e pagar' : 'Enviar solicitação'}</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: Palette.paper,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: Spacing.xl,
    },
    eventTitle: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.3,
        marginBottom: Spacing.sm,
        color: Palette.ink,
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 21,
        color: Palette.inkSoft,
        marginBottom: Spacing.xxl,
    },
    notice: {
        padding: Spacing.lg,
        borderRadius: 22,
        backgroundColor: Palette.orangeSoft,
        marginBottom: Spacing.xl,
        gap: Spacing.sm,
    },
    noticeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    noticeTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: Palette.orangeDarker,
    },
    noticeBody: {
        fontSize: 14,
        color: Palette.inkSoft,
        lineHeight: 21,
    },
    questionContainer: {
        marginBottom: Spacing.xl,
    },
    questionLabel: {
        fontSize: 15,
        fontWeight: '800',
        marginBottom: Spacing.sm,
        color: Palette.ink,
    },
    asterisk: {
        color: Palette.danger,
    },
    input: {
        borderWidth: 1,
        borderColor: Palette.line,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        fontSize: 15,
        color: Palette.ink,
        backgroundColor: Palette.surface,
        minHeight: 48,
    },
    footer: {
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.lg,
        borderTopWidth: 1,
        borderTopColor: Palette.lineSoft,
        backgroundColor: Palette.surface,
        ...Elevation.floating,
    },
    button: {
        backgroundColor: Palette.orange,
        minHeight: 52,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabledButton: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
    },
});
