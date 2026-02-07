import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/shared/lib/supabase';
import { StatusBadge } from '@/components/ui/StatusBadge';

export default function NotificationsScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState<any[]>([]);

    useEffect(() => {
        fetchNotifications();
    }, []);

    async function fetchNotifications() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Since we don't have a dedicated notifications table yet, 
            // we'll mock notifications by fetching recent booking status updates.
            // In a real app, this would query a 'notifications' table.

            const { data: bookings, error } = await supabase
                .from('event_participants')
                .select(`
                    id, 
                    status, 
                    updated_at,
                    event:events(title, event_date)
                `)
                .eq('user_id', session.user.id)
                .order('updated_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            // Transform bookings into "notifications"
            const notifs = bookings.map((b: any) => ({
                id: b.id,
                type: 'STATUS_UPDATE',
                title: 'Atualização de Inscrição',
                message: getMessageForStatus(b.status, b.event?.title),
                date: b.updated_at,
                read: false, // We don't track read status yet
                status: b.status
            }));

            setNotifications(notifs);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    }

    function getMessageForStatus(status: string, eventTitle: string) {
        switch (status) {
            case 'confirmed':
            case 'APPROVED':
                return `Sua inscrição para "${eventTitle}" foi confirmada!`;
            case 'rejected':
            case 'REJECTED':
                return `Atualização sobre sua inscrição em "${eventTitle}".`;
            case 'pending':
            case 'PENDING':
                return `Sua solicitação para "${eventTitle}" foi enviada.`;
            default:
                return `Status atualizado para "${eventTitle}".`;
        }
    }

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.iconContainer}>
                {item.status === 'confirmed' ? (
                    <Ionicons name="checkmark-circle" size={24} color="#4CD964" />
                ) : item.status === 'rejected' ? (
                    <Ionicons name="close-circle" size={24} color="#FF3B30" />
                ) : (
                    <Ionicons name="time" size={24} color="#FF8C42" />
                )}
            </View>
            <View style={styles.content}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.message}>{item.message}</Text>
                <Text style={styles.date}>{new Date(item.date).toLocaleDateString('pt-BR')} • {new Date(item.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
            {item.status && <StatusBadge status={item.status} className="ml-2" />}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notificações</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#FF8C42" />
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="notifications-off-outline" size={48} color="#ccc" />
                            <Text style={styles.emptyText}>Nenhuma notificação recente.</Text>
                        </View>
                    }
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
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
        gap: 12,
    },
    card: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    iconContainer: {
        marginRight: 16,
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    message: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    date: {
        fontSize: 10,
        color: '#999',
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        gap: 16,
    },
    emptyText: {
        color: '#999',
        fontSize: 16,
    },
});
