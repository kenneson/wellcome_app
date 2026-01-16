import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

export default function EventDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [event, setEvent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [isParticipant, setIsParticipant] = useState(false);
    const [isHost, setIsHost] = useState(false);
    const [participantCount, setParticipantCount] = useState(0);

    useEffect(() => {
        fetchEventDetails();
    }, [id]);

    async function fetchEventDetails() {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            const currentUserId = session?.user?.id;

            // 1. Fetch Event + Host
            const { data: eventData, error } = await supabase
                .from('events')
                .select(`
                    *,
                    host:profiles(full_name, avatar_url, occupation)
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            setEvent(eventData);

            setIsHost(eventData.host_id === currentUserId);

            // 2. Check Participation & Count
            // Fetch all participants
            const { data: participants, error: pError } = await supabase
                .from('event_participants')
                .select('user_id')
                .eq('event_id', id);

            if (pError) throw pError;

            // Check if I am in the list
            const AmIIn = participants.find((p: any) => p.user_id === currentUserId);
            setIsParticipant(!!AmIIn);
            setParticipantCount(participants.length);

        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Não foi possível carregar o evento.');
            router.back();
        } finally {
            setLoading(false);
        }
    }

    async function handleJoin() {
        if (!event) return;
        setJoining(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                Alert.alert('Login necessário', 'Você precisa estar logado para participar.');
                return;
            }

            const { error } = await supabase
                .from('event_participants')
                .insert({
                    event_id: event.id,
                    user_id: session.user.id
                });

            if (error) throw error;

            setIsParticipant(true);
            setParticipantCount(prev => prev + 1);
            Alert.alert('Bem-vindo!', 'Sua presença foi confirmada.');

        } catch (error: any) {
            console.error(error);
            Alert.alert('Erro', error.message || 'Falha ao participar do evento.');
        } finally {
            setJoining(false);
        }
    }

    async function handleLeave() {
        setJoining(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { error } = await supabase
                .from('event_participants')
                .delete()
                .eq('event_id', event.id)
                .eq('user_id', session.user.id);

            if (error) throw error;

            setIsParticipant(false);
            setParticipantCount(prev => prev - 1);

        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Falha ao cancelar participação.');
        } finally {
            setJoining(false);
        }
    }

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF8C42" />
            </View>
        );
    }

    if (!event) return null;

    const isFull = participantCount >= (event.max_guests || 0);
    const canJoin = !isFull && !isParticipant && !isHost;

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Hero Image */}
                <Image
                    source={{ uri: event.cover_image_url || 'https://via.placeholder.com/400x200' }}
                    style={styles.coverImage}
                />

                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>

                <View style={styles.content}>
                    <Text style={styles.title}>{event.title}</Text>

                    <View style={styles.hostRow}>
                        <Image
                            source={{ uri: event.host?.avatar_url || 'https://via.placeholder.com/40' }}
                            style={styles.hostAvatar}
                        />
                        <View>
                            <Text style={styles.hostLabel}>Anfitrião</Text>
                            <Text style={styles.hostName}>{event.host?.full_name}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <Ionicons name="calendar-outline" size={20} color="#666" style={styles.infoIcon} />
                        <Text style={styles.infoText}>
                            {new Date(event.event_date).toLocaleDateString('pt-BR')} às {new Date(event.event_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Ionicons name="location-outline" size={20} color="#666" style={styles.infoIcon} />
                        <Text style={styles.infoText}>{event.location}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Ionicons name="people-outline" size={20} color="#666" style={styles.infoIcon} />
                        <Text style={styles.infoText}>
                            {participantCount} / {event.max_guests} convidados confirmados
                        </Text>
                    </View>

                    <View style={styles.divider} />

                    <Text style={styles.sectionTitle}>Sobre o evento</Text>
                    <Text style={styles.description}>{event.description}</Text>

                    <View style={{ height: 100 }} />
                </View>
            </ScrollView>

            <View style={styles.footer}>
                {isHost ? (
                    <TouchableOpacity style={[styles.button, styles.disabledButton]} disabled>
                        <Text style={styles.buttonText}>Você é o anfitrião</Text>
                    </TouchableOpacity>
                ) : isParticipant ? (
                    <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleLeave} disabled={joining}>
                        {joining ? (
                            <ActivityIndicator color="#FF8C42" />
                        ) : (
                            <Text style={styles.secondaryButtonText}>Cancelar Presença</Text>
                        )}
                    </TouchableOpacity>
                ) : isFull ? (
                    <TouchableOpacity style={[styles.button, styles.disabledButton]} disabled>
                        <Text style={styles.buttonText}>Vagas Esgotadas</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.button} onPress={handleJoin} disabled={joining}>
                        {joining ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.buttonText}>Confirmar Presença</Text>
                        )}
                    </TouchableOpacity>
                )}
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
    scrollContent: {
        paddingBottom: 20
    },
    coverImage: {
        width: '100%',
        height: 250,
        backgroundColor: '#eee',
    },
    backButton: {
        position: 'absolute',
        top: 40,
        left: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 20,
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
    },
    hostRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    hostAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
    },
    hostLabel: {
        fontSize: 12,
        color: '#999',
    },
    hostName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    infoIcon: {
        marginRight: 12,
        width: 24,
        textAlign: 'center'
    },
    infoText: {
        fontSize: 16,
        color: '#555',
        flex: 1,
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    description: {
        fontSize: 14,
        lineHeight: 24,
        color: '#666',
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
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    disabledButton: {
        backgroundColor: '#ccc',
    },
    secondaryButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#FF8C42',
    },
    secondaryButtonText: {
        color: '#FF8C42',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
