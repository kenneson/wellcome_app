import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/shared/lib/supabase';
import { DEFAULT_PLACEHOLDER_IMAGE, shadows } from '@/shared/lib/styles';
import { eventService } from '@/services/api/EventService';
import { getOptimizedImageUrl } from '@/utils/imageOptimizer';
import { LinearGradient } from 'expo-linear-gradient';
import { formatPrice } from '@/utils/formatters';

type EventFilter = 'todos' | 'ativos' | 'concluidos';

export default function MyEventsScreen() {
    const router = useRouter();
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<EventFilter>('todos');

    useEffect(() => {
        fetchMyEvents();
    }, []);

    async function fetchMyEvents() {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Fetch events with participant count
            const { data, error } = await supabase
                .from('events')
                .select(`
                    *,
                    event_participants(count)
                `)
                .eq('host_id', session.user.id)
                .order('event_date', { ascending: false });

            if (error) throw error;
            
            // Map the data to include participant count directly
            const formattedEvents = data?.map(event => ({
                ...event,
                participants_count: event.event_participants?.[0]?.count || 0
            })) || [];

            setEvents(formattedEvents);
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
                            await eventService.deleteEvent(id);
                            setEvents(prev => prev.filter(e => e.id !== id));
                        } catch (e: any) {
                            Alert.alert('Erro ao excluir', e.message);
                        }
                    }
                }
            ]
        );
    }

    const filteredEvents = useMemo(() => {
        const now = new Date();
        return events.filter(event => {
            const eventDate = new Date(event.event_date);
            const isPast = eventDate < now;

            if (activeFilter === 'ativos') return !isPast;
            if (activeFilter === 'concluidos') return isPast;
            return true;
        });
    }, [events, activeFilter]);

    const renderItem = ({ item }: { item: any }) => {
        const eventDate = new Date(item.event_date);
        const isPast = eventDate < new Date();
        const progress = Math.min((item.participants_count || 0) / (item.max_guests || 1), 1);

        if (isPast) {
            // Concluded Event Card Style
            return (
                <View style={styles.card}>
                    <View style={styles.imageContainer}>
                        <Image
                            source={{ uri: getOptimizedImageUrl(item.cover_image_url, { width: 400 }) || DEFAULT_PLACEHOLDER_IMAGE }}
                            style={[styles.cardImage, { opacity: 0.6 }]}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                        />
                        <View style={styles.badgeContainer}>
                            <View style={[styles.badge, styles.concludedBadge]}>
                                <Text style={styles.concludedBadgeText}>CONCLUÍDO</Text>
                            </View>
                        </View>
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.7)']}
                            style={styles.imageOverlay}
                        >
                            <Text style={styles.cardTitleOverlay}>{item.title}</Text>
                        </LinearGradient>
                    </View>

                    <View style={styles.cardContent}>
                        <View style={styles.row}>
                            <Ionicons name="calendar-outline" size={16} color="#666" />
                            <Text style={styles.dateText}>
                                {eventDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                            </Text>
                            <Text style={styles.priceText}>
                                {formatPrice(item.price)}
                                <Text style={styles.perGuestText}> por convidado</Text>
                            </Text>
                        </View>
                    </View>

                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.secondaryAction} onPress={() => router.push(`/events/${item.id}`)}>
                            <Ionicons name="eye-outline" size={18} color="#666" />
                            <Text style={styles.secondaryActionText}>Ver Detalhes</Text>
                        </TouchableOpacity>
                        {/* Duplicate logic could go here */}
                    </View>
                </View>
            );
        }

        // Active Event Card Style
        return (
            <View style={styles.card}>
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: getOptimizedImageUrl(item.cover_image_url, { width: 400 }) || DEFAULT_PLACEHOLDER_IMAGE }}
                        style={styles.cardImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                    />
                    <View style={styles.badgeContainer}>
                        <View style={[styles.badge, styles.activeBadge]}>
                            <Text style={styles.activeBadgeText}>ATIVO</Text>
                        </View>
                    </View>
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        style={styles.imageOverlay}
                    >
                        <Text style={styles.cardTitleOverlay}>{item.title}</Text>
                    </LinearGradient>
                </View>

                <View style={styles.cardContent}>
                    <View style={styles.infoRow}>
                        <View style={styles.dateInfo}>
                            <Ionicons name="calendar-outline" size={16} color="#666" />
                            <Text style={styles.dateText}>
                                {eventDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                            </Text>
                        </View>
                        <View>
                            <Text style={styles.priceHighlight}>{formatPrice(item.price)}</Text>
                            <Text style={styles.perGuestText}>por convidado</Text>
                        </View>
                    </View>

                    <View style={styles.progressContainer}>
                        <View style={styles.progressHeader}>
                            <Text style={styles.progressLabel}>Participantes</Text>
                            <Text style={styles.progressValue}>
                                <Text style={{ color: '#FF8C42', fontWeight: 'bold' }}>{item.participants_count}</Text>
                                /{item.max_guests} vagas
                            </Text>
                        </View>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
                        </View>
                    </View>
                </View>

                <View style={styles.cardActions}>
                    <TouchableOpacity 
                        style={styles.actionButton} 
                        onPress={() => router.push(`/events/${item.id}/edit`)}
                    >
                        <Ionicons name="pencil" size={18} color="#FF8C42" />
                        <Text style={styles.actionButtonText}>Editar</Text>
                    </TouchableOpacity>
                    
                    <View style={styles.actionDivider} />
                    
                    <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => router.push(`/events/${item.id}/registrations`)}
                    >
                        <Ionicons name="people" size={18} color="#FF8C42" />
                        <Text style={styles.actionButtonText}>Lista</Text>
                    </TouchableOpacity>

                    <View style={styles.actionDivider} />

                    <TouchableOpacity 
                        style={styles.actionButton} 
                        onPress={() => handleDelete(item.id)}
                    >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Excluir</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="light-content" backgroundColor="#FF8C42" />
            
            {/* Header */}
            <View style={styles.header}>
                <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.menuButton}>
                            <Ionicons name="menu-outline" size={28} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Meus Eventos</Text>
                        <TouchableOpacity style={styles.notificationButton}>
                             <Ionicons name="notifications-outline" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.searchBar}>
                        <Ionicons name="search-outline" size={20} color="#9CA3AF" />
                        <Text style={styles.searchPlaceholder}>Buscar meus eventos...</Text>
                    </View>
                </SafeAreaView>
            </View>

            {/* Content */}
            <View style={styles.contentBody}>
                <View style={styles.subHeader}>
                    <Text style={styles.subHeaderTitle}>Meus Eventos</Text>
                    <TouchableOpacity 
                        style={styles.createButton} 
                        onPress={() => router.push('/events/create')}
                    >
                        <Ionicons name="add" size={16} color="#fff" />
                        <Text style={styles.createButtonText}>Criar Novo</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.filterTabs}>
                    {(['todos', 'ativos', 'concluidos'] as EventFilter[]).map((filter) => (
                        <TouchableOpacity
                            key={filter}
                            style={[styles.filterTab, activeFilter === filter && styles.activeFilterTab]}
                            onPress={() => setActiveFilter(filter)}
                        >
                            <Text style={[
                                styles.filterText, 
                                activeFilter === filter && styles.activeFilterText
                            ]}>
                                {filter.charAt(0).toUpperCase() + filter.slice(1)}
                                {filter === 'ativos' && ` (${events.filter(e => new Date(e.event_date) >= new Date()).length})`}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#FF8C42" style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        data={filteredEvents}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>Nenhum evento encontrado.</Text>
                                <TouchableOpacity style={styles.createButtonLarge} onPress={() => router.push('/events/create')}>
                                    <Text style={styles.createButtonTextLarge}>Criar meu primeiro evento</Text>
                                </TouchableOpacity>
                            </View>
                        }
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9F9F9',
    },
    header: {
        backgroundColor: '#FF8C42',
        paddingBottom: 20,
    },
    headerSafeArea: {
        paddingHorizontal: 16,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    menuButton: {
        padding: 4,
    },
    notificationButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 25,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginTop: 8,
    },
    searchPlaceholder: {
        color: '#9CA3AF',
        marginLeft: 8,
        fontSize: 14,
    },
    contentBody: {
        flex: 1,
        marginTop: 10,
    },
    subHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    subHeaderTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF8C42',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    createButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 13,
        marginLeft: 4,
    },
    filterTabs: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 16,
        gap: 8,
    },
    filterTab: {
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    activeFilterTab: {
        backgroundColor: '#FF8C42',
        borderColor: '#FF8C42',
    },
    filterText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },
    activeFilterText: {
        color: '#fff',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 30,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        marginBottom: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
    },
    imageContainer: {
        height: 160,
        position: 'relative',
    },
    cardImage: {
        width: '100%',
        height: '100%',
    },
    imageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60%',
        justifyContent: 'flex-end',
        padding: 16,
    },
    badgeContainer: {
        position: 'absolute',
        top: 12,
        right: 12,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    activeBadge: {
        backgroundColor: '#22C55E', // Green-500
    },
    concludedBadge: {
        backgroundColor: '#9CA3AF', // Gray-400
    },
    activeBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    concludedBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    cardTitleOverlay: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    cardContent: {
        padding: 16,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    dateInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateText: {
        fontSize: 14,
        color: '#4B5563',
        marginLeft: 6,
    },
    priceHighlight: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FF8C42',
        textAlign: 'right',
    },
    perGuestText: {
        fontSize: 10,
        color: '#9CA3AF',
        textAlign: 'right',
    },
    progressContainer: {
        marginBottom: 4,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    progressLabel: {
        fontSize: 12,
        color: '#374151',
        fontWeight: '600',
    },
    progressValue: {
        fontSize: 12,
        color: '#6B7280',
    },
    progressBarBg: {
        height: 6,
        backgroundColor: '#E5E7EB',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#FF8C42',
        borderRadius: 3,
    },
    cardActions: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingVertical: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 4,
    },
    actionButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
        marginLeft: 6,
    },
    actionDivider: {
        width: 1,
        backgroundColor: '#E5E7EB',
        height: '100%',
    },
    // Concluded styles additions
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    priceText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#374151',
        marginLeft: 'auto',
    },
    actionRow: {
        flexDirection: 'row',
        padding: 16,
        paddingTop: 0,
        justifyContent: 'center',
    },
    secondaryAction: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
    },
    secondaryActionText: {
        marginLeft: 8,
        color: '#4B5563',
        fontWeight: '600',
        fontSize: 14,
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#9CA3AF',
        marginBottom: 20,
    },
    createButtonLarge: {
        backgroundColor: '#FF8C42',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    createButtonTextLarge: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});