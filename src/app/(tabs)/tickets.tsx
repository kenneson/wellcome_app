import { StatusBadge } from '@/components/ui/StatusBadge';
import { Colors, Spacing } from '@/shared/constants/theme';
import { supabase } from '@/shared/lib/supabase';
import { DEFAULT_PLACEHOLDER_IMAGE } from '@/shared/lib/styles';
import { formatFirstName, formatShortDate } from '@/utils/formatters';
import { getOptimizedImageUrl } from '@/utils/imageOptimizer';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TabFilter = 'upcoming' | 'history';

export default function TicketsScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabFilter>('upcoming');
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchBookings = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data, error } = await supabase
                .from('event_participants')
                .select(`
                    id,
                    status,
                    created_at,
                    event:events(
                        id,
                        title,
                        event_date,
                        end_time,
                        cover_image_url,
                        location,
                        price,
                        host:profiles(full_name, avatar_url)
                    )
                `)
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBookings(data || []);
        } catch (error) {
            if (__DEV__) console.error('Error fetching bookings:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            fetchBookings();
        }, [fetchBookings])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchBookings();
    };

    const now = new Date();
    const filteredBookings = bookings.filter((b: any) => {
        if (!b.event?.event_date) return false;
        const eventDate = new Date(b.event.event_date);
        if (activeTab === 'upcoming') return eventDate >= now;
        return eventDate < now;
    });

    const renderBookingCard = ({ item }: { item: any }) => {
        const event = item.event;
        if (!event) return null;

        const eventDate = new Date(event.event_date);
        const isUpcoming = eventDate >= now;
        const isApproved = item.status === 'APPROVED';
        const isPending = item.status === 'PENDING';

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/events/${event.id}`)}
                activeOpacity={0.7}
            >
                <Image
                    source={{ uri: getOptimizedImageUrl(event.cover_image_url, { width: 200 }) || DEFAULT_PLACEHOLDER_IMAGE }}
                    style={styles.cardImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                />
                <View style={styles.cardContent}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{event.title}</Text>
                    <Text style={styles.cardSubtitle} numberOfLines={1}>
                        {formatFirstName(event.host?.full_name)} â€¢ {formatShortDate(event.event_date)}
                    </Text>
                    <View style={styles.cardFooter}>
                        <StatusBadge status={item.status} />
                        {isUpcoming && isApproved && (
                            <TouchableOpacity
                                style={styles.ticketBtn}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    router.push(`/events/${event.id}/ticket`);
                                }}
                            >
                                <Ionicons name="qr-code-outline" size={16} color={Colors.light.primary} />
                                <Text style={styles.ticketBtnText}>Ingresso</Text>
                            </TouchableOpacity>
                        )}
                        {isUpcoming && isPending && (
                            <View style={styles.pendingHint}>
                                <Ionicons name="time-outline" size={14} color="#F59E0B" />
                                <Text style={styles.pendingHintText}>Aguardando</Text>
                            </View>
                        )}
                        {!isUpcoming && isApproved && (
                            <TouchableOpacity
                                style={styles.reviewBtn}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    router.push(`/events/${event.id}`);
                                }}
                            >
                                <Ionicons name="star-outline" size={14} color={Colors.light.primary} />
                                <Text style={styles.reviewBtnText}>Avaliar</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <View style={styles.emptyIconBg}>
                <Ionicons
                    name={activeTab === 'upcoming' ? 'ticket-outline' : 'time-outline'}
                    size={48}
                    color="#CDCDE0"
                />
            </View>
            <Text style={styles.emptyTitle}>
                {activeTab === 'upcoming'
                    ? 'Nenhum evento agendado'
                    : 'Nenhuma experiência ainda'}
            </Text>
            <Text style={styles.emptyBody}>
                {activeTab === 'upcoming'
                    ? 'Explore eventos próximos a você e garanta sua vaga!'
                    : 'Participe de eventos para construir seu histórico.'}
            </Text>
            {activeTab === 'upcoming' && (
                <TouchableOpacity
                    style={styles.exploreCta}
                    onPress={() => router.push('/(tabs)')}
                >
                    <Text style={styles.exploreCtaText}>Explorar Eventos</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Meus Ingressos</Text>
                <Ionicons name="ticket-outline" size={24} color={Colors.light.primary} />
            </View>

            {/* Tab Switcher */}
            <View style={styles.tabSwitcher}>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'upcoming' && styles.tabBtnActive]}
                    onPress={() => setActiveTab('upcoming')}
                >
                    <Ionicons
                        name="calendar-outline"
                        size={16}
                        color={activeTab === 'upcoming' ? '#FFF' : Colors.light.textSecondary}
                        style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
                        Agendados
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
                    onPress={() => setActiveTab('history')}
                >
                    <Ionicons
                        name="time-outline"
                        size={16}
                        color={activeTab === 'history' ? '#FFF' : Colors.light.textSecondary}
                        style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
                        Histórico
                    </Text>
                </TouchableOpacity>
            </View>

            {/* List */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.light.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredBookings}
                    keyExtractor={(item) => item.id}
                    renderItem={renderBookingCard}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[Colors.light.primary]}
                        />
                    }
                    ListEmptyComponent={renderEmptyState}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333333',
    },
    tabSwitcher: {
        flexDirection: 'row',
        marginHorizontal: 24,
        backgroundColor: '#EEEEEE',
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
    },
    tabBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
    },
    tabBtnActive: {
        backgroundColor: Colors.light.primary,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.textSecondary,
    },
    tabTextActive: {
        color: '#FFF',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingHorizontal: 24,
        paddingBottom: 30,
    },
    card: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    cardImage: {
        width: 90,
        height: 100,
    },
    cardContent: {
        flex: 1,
        padding: 12,
        justifyContent: 'space-between',
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#333333',
        marginBottom: 2,
    },
    cardSubtitle: {
        fontSize: 12,
        color: '#666',
        marginBottom: 8,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    ticketBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF3E0',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        gap: 4,
    },
    ticketBtnText: {
        color: Colors.light.primary,
        fontSize: 12,
        fontWeight: '600',
    },
    pendingHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    pendingHintText: {
        color: '#F59E0B',
        fontSize: 11,
        fontWeight: '500',
    },
    reviewBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FFF3E0',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    reviewBtnText: {
        color: Colors.light.primary,
        fontSize: 12,
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 32,
    },
    emptyIconBg: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333333',
        textAlign: 'center',
        marginBottom: 8,
    },
    emptyBody: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    exploreCta: {
        backgroundColor: Colors.light.primary,
        paddingHorizontal: 28,
        paddingVertical: 12,
        borderRadius: 24,
    },
    exploreCtaText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: 'bold',
    },
});
