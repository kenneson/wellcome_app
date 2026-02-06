import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/shared/lib/supabase';
import { DEFAULT_PLACEHOLDER_IMAGE, shadows } from '@/shared/lib/styles';

export default function MyEventsScreen() {
    const router = useRouter();
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMyEvents();
    }, []);

    async function fetchMyEvents() {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('host_id', session.user.id)
                .order('event_date', { ascending: true });

            if (error) throw error;
            setEvents(data || []);
        } catch (error: any) {
            Alert.alert('Erro', error.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: string) {
        Alert.alert(
            'Confirmar exclusão',
            'Tem certeza que deseja cancelar este evento? Essa ação não pode ser desfeita.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase.from('events').delete().eq('id', id);
                            if (error) throw error;
                            setEvents(prev => prev.filter(e => e.id !== id));
                        } catch (e: any) {
                            Alert.alert('Erro ao excluir', e.message);
                        }
                    }
                }
            ]
        );
    }

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <Image
                source={{ uri: item.cover_image_url || DEFAULT_PLACEHOLDER_IMAGE }}
                style={styles.cardImage}
            />
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDate}>
                    {new Date(item.event_date).toLocaleDateString('pt-BR')} às {new Date(item.event_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Text style={styles.cardStatus}>
                    {item.max_guests} convidados
                </Text>
            </View>
            <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionButton} onPress={() => Alert.alert('Editar', 'Funcionalidade de edição em breve!')}>
                    <Ionicons name="pencil-outline" size={20} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => handleDelete(item.id)}>
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Meus Eventos</Text>
                <View style={{ width: 24 }} />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#FF8C42" style={{ marginTop: 20 }} />
            ) : events.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>Você ainda não criou nenhum evento.</Text>
                    <TouchableOpacity style={styles.createButton} onPress={() => router.push('/events/create')}>
                        <Text style={styles.createButtonText}>Criar meu primeiro evento</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={events}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9F9F9',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
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
    listContent: {
        padding: 16,
    },
    card: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 16,
        padding: 12,
        alignItems: 'center',
        ...shadows.sm,
    },
    cardImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: '#eee',
    },
    cardContent: {
        flex: 1,
        marginLeft: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    cardDate: {
        fontSize: 12,
        color: '#666',
        marginBottom: 2,
    },
    cardStatus: {
        fontSize: 12,
        color: '#FF8C42',
        fontWeight: '500',
    },
    cardActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        padding: 8,
        marginLeft: 4,
    },
    deleteButton: {
        // marginLeft: 8,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
        marginBottom: 16,
        textAlign: 'center',
    },
    createButton: {
        backgroundColor: '#FF8C42',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
    },
    createButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});
