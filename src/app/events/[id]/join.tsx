import { registrationService } from '@/services/api/RegistrationService';
import { eventService } from '@/services/api/EventService';
import { supabase } from '@/shared/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function JoinEventScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [event, setEvent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [answers, setAnswers] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        if (id) fetchEventDetails();
    }, [id]);

    async function fetchEventDetails() {
        try {
            setLoading(true);
            const data = await eventService.getEventById(String(id));

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
                    'JÃ¡ Solicitado',
                    'Você já enviou uma solicitação para este evento.',
                    [{ text: 'OK', onPress: () => router.push(`/events/${event.id}`) }]
                );
            } else {
                Alert.alert('Erro', error.message || 'Falha ao solicitar inscrição.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF8C42" />
            </View>
        );
    }

    if (!event) return null;

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Solicitar Inscrição</Text>
                <View style={{ width: 40 }} />
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
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.subtitle}>
                        {event.questions && event.questions.length > 0
                            ? 'Por favor, responda as perguntas abaixo para concluir sua solicitação.'
                            : 'Confirme sua solicitação abaixo.'}
                    </Text>

                    {event.questions?.map((q: any) => (
                        <View key={q.id} style={styles.questionContainer}>
                            <Text style={styles.questionLabel}>
                                {q.question} {q.required && <Text style={styles.asterisk}>*</Text>}
                            </Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Sua resposta..."
                                placeholderTextColor="#999"
                                value={answers[q.id] || ''}
                                onChangeText={(text) => handleAnswerChange(q.id, text)}
                                multiline
                            />
                        </View>
                    ))}

                    <View style={{ height: 100 }} />
            </KeyboardAwareScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.button, submitting && styles.disabledButton]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Enviar Solicitação</Text>
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
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    content: {
        padding: 24,
    },
    eventTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333',
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 24,
    },
    questionContainer: {
        marginBottom: 20,
    },
    questionLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        color: '#333',
    },
    asterisk: {
        color: '#FF3B30',
    },
    input: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#FAFAFA',
        minHeight: 50,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        backgroundColor: '#fff',
    },
    button: {
        backgroundColor: '#FF8C42',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    disabledButton: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
