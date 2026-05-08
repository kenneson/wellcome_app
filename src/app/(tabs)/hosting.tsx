import { Colors, Spacing } from '@/shared/constants/theme';
import { supabase } from '@/shared/lib/supabase';
import { DEFAULT_PLACEHOLDER_IMAGE } from '@/shared/lib/styles';
import { formatPrice } from '@/utils/formatters';
import { getOptimizedImageUrl } from '@/utils/imageOptimizer';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const C = Colors.host;

export default function HostingScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [events, setEvents] = useState<any[]>([]);
    const [walletBalance, setWalletBalance] = useState(0);
    const [pendingCount, setPendingCount] = useState(0);
    const [hasEvents, setHasEvents] = useState(false);

    const fetchHostData = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Fetch host's events with participant counts
            const { data: eventsData, error: eventsError } = await supabase
                .from('events')
                .select(`
                    *,
                    event_participants(id, status)
                `)
                .eq('host_id', session.user.id)
                .order('event_date', { ascending: false });

            if (eventsError) throw eventsError;

            const formattedEvents = (eventsData || []).map(event => ({
                ...event,
                participants_count: event.event_participants?.filter(
                    (p: any) => p.status !== 'REJECTED' && p.status !== 'CANCELLED'
                ).length || 0,
                pending_count: event.event_participants?.filter(
                    (p: any) => p.status === 'PENDING'
                ).length || 0,
            }));

            setEvents(formattedEvents);
            setHasEvents(formattedEvents.length > 0);

            // Calculate total pending across all events
            const totalPending = formattedEvents.reduce((sum, e) => sum + e.pending_count, 0);
            setPendingCount(totalPending);

            // Fetch wallet balance
            const { data: profile } = await supabase
                .from('profiles')
                .select('wallet_balance')
                .eq('id', session.user.id)
                .single();

            setWalletBalance(profile?.wallet_balance ?? 0);
        } catch (error) {
            if (__DEV__) console.error('Error fetching host data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            fetchHostData();
        }, [fetchHostData])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchHostData();
    };

    const now = new Date();
    const activeEvents = events.filter(e => new Date(e.event_date) >= now);
    const pastEvents = events.filter(e => new Date(e.event_date) < now);
    const nextEvent = activeEvents.length > 0 ? activeEvents[activeEvents.length - 1] : null; // Closest upcoming

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={C.accent} />
                </View>
            </SafeAreaView>
        );
    }

    // ── Onboarding for first-time hosts ──
    if (!hasEvents) {
        return (
            <SafeAreaView style={styles.container}>
                <LinearGradient colors={[C.headerBg, C.primary]} style={styles.onboardingHeader}>
                    <Ionicons name="home-outline" size={64} color="rgba(255,255,255,0.3)" />
                </LinearGradient>
                <View style={styles.onboardingContent}>
                    <View style={styles.onboardingIconBg}>
                        <Ionicons name="restaurant-outline" size={48} color={C.accent} />
                    </View>
                    <Text style={styles.onboardingTitle}>Seja um Anfitrião Wellcome!</Text>
                    <Text style={styles.onboardingBody}>
                        Crie seu primeiro evento gastronômico, receba pessoas na sua casa e ganhe dinheiro
                        compartilhando suas habilidades culinárias.
                    </Text>

                    <View style={styles.onboardingSteps}>
                        {[
                            { icon: 'create-outline', text: 'Crie seu evento com cardápio' },
                            { icon: 'people-outline', text: 'Receba inscrições de participantes' },
                            { icon: 'wallet-outline', text: 'Ganhe dinheiro na sua carteira' },
                        ].map((step, i) => (
                            <View key={i} style={styles.stepRow}>
                                <View style={styles.stepIconBg}>
                                    <Ionicons name={step.icon as any} size={20} color={C.accent} />
                                </View>
                                <Text style={styles.stepText}>{step.text}</Text>
                            </View>
                        ))}
                    </View>

                    <TouchableOpacity
                        style={styles.createFirstBtn}
                        onPress={() => router.push('/events/create')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="add-circle-outline" size={22} color="#FFF" style={{ marginRight: 8 }} />
                        <Text style={styles.createFirstBtnText}>Criar meu primeiro evento</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // ── Main Host Dashboard ──
    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <LinearGradient colors={[C.headerBg, C.primary]} style={styles.header}>
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.headerLabel}>Painel do Anfitrião</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="home" size={24} color="#FFF" style={{ marginRight: 8 }} />
                            <Text style={styles.headerTitle}>Meus Eventos</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.notifBtn}
                        onPress={() => router.push('/notifications')}
                    >
                        <Ionicons name="notifications-outline" size={22} color="#FFF" />
                        {pendingCount > 0 && (
                            <View style={styles.notifBadge}>
                                <Text style={styles.notifBadgeText}>{pendingCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Quick Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Text style={styles.statNumber}>{activeEvents.length}</Text>
                        <Text style={styles.statLabel}>Ativos</Text>
                    </View>
                    <View style={[styles.statBox, styles.statBoxMiddle]}>
                        <Text style={styles.statNumber}>{pastEvents.length}</Text>
                        <Text style={styles.statLabel}>Realizados</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={[styles.statNumber, pendingCount > 0 && { color: '#F59E0B' }]}>
                            {pendingCount}
                        </Text>
                        <Text style={styles.statLabel}>Pendentes</Text>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.accent]} />
                }
            >
                {/* Wallet Card */}
                <TouchableOpacity
                    style={styles.walletCard}
                    onPress={() => router.push('/profile/wallet')}
                    activeOpacity={0.8}
                >
                    <View style={styles.walletLeft}>
                        <View style={styles.walletIconBg}>
                            <Ionicons name="wallet-outline" size={22} color="#FFF" />
                        </View>
                        <View>
                            <Text style={styles.walletLabel}>Saldo disponível</Text>
                            <Text style={styles.walletAmount}>
                                R$ {Number(walletBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>

                {/* CTA Create */}
                <TouchableOpacity
                    style={styles.createBtn}
                    onPress={() => router.push('/events/create')}
                    activeOpacity={0.8}
                >
                    <Ionicons name="add-circle-outline" size={22} color={C.primary} style={{ marginRight: 8 }} />
                    <Text style={styles.createBtnText}>Criar Novo Evento</Text>
                </TouchableOpacity>

                {/* Next Event Hero */}
                {nextEvent && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Próximo Evento</Text>
                        <TouchableOpacity
                            style={styles.nextEventCard}
                            onPress={() => router.push(`/events/${nextEvent.id}`)}
                            activeOpacity={0.8}
                        >
                            <Image
                                source={{ uri: getOptimizedImageUrl(nextEvent.cover_image_url, { width: 600 }) || DEFAULT_PLACEHOLDER_IMAGE }}
                                style={styles.nextEventImage}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                            />
                            <LinearGradient
                                colors={['transparent', 'rgba(0,0,0,0.75)']}
                                style={styles.nextEventOverlay}
                            >
                                <Text style={styles.nextEventTitle}>{nextEvent.title}</Text>
                                <View style={styles.nextEventMeta}>
                                    <View style={styles.metaItem}>
                                        <Ionicons name="calendar-outline" size={14} color="#FFF" />
                                        <Text style={styles.metaText}>
                                            {new Date(nextEvent.event_date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                                        </Text>
                                    </View>
                                    <View style={styles.metaItem}>
                                        <Ionicons name="people-outline" size={14} color="#FFF" />
                                        <Text style={styles.metaText}>
                                            {nextEvent.participants_count}/{nextEvent.max_guests}
                                        </Text>
                                    </View>
                                </View>
                            </LinearGradient>
                            {nextEvent.pending_count > 0 && (
                                <View style={styles.pendingBadgeFloat}>
                                    <Text style={styles.pendingBadgeFloatText}>
                                        {nextEvent.pending_count} pendente{nextEvent.pending_count > 1 ? 's' : ''}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        {/* Quick Actions for Next Event */}
                        <View style={styles.quickActions}>
                            <TouchableOpacity
                                style={styles.quickActionBtn}
                                onPress={() => router.push(`/events/${nextEvent.id}/scanner`)}
                            >
                                <Ionicons name="scan-outline" size={20} color={C.primary} />
                                <Text style={styles.quickActionText}>Escanear</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.quickActionBtn}
                                onPress={() => router.push(`/events/${nextEvent.id}/registrations`)}
                            >
                                <Ionicons name="people-outline" size={20} color={C.primary} />
                                <Text style={styles.quickActionText}>Inscrições</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.quickActionBtn}
                                onPress={() => router.push(`/events/${nextEvent.id}/edit`)}
                            >
                                <Ionicons name="pencil-outline" size={20} color={C.primary} />
                                <Text style={styles.quickActionText}>Editar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Active Events List */}
                {activeEvents.length > (nextEvent ? 1 : 0) && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Eventos Ativos</Text>
                        {activeEvents
                            .filter(e => nextEvent ? e.id !== nextEvent.id : true)
                            .map(event => (
                                <TouchableOpacity
                                    key={event.id}
                                    style={styles.eventRow}
                                    onPress={() => router.push(`/events/${event.id}`)}
                                    activeOpacity={0.7}
                                >
                                    <Image
                                        source={{ uri: getOptimizedImageUrl(event.cover_image_url, { width: 120 }) || DEFAULT_PLACEHOLDER_IMAGE }}
                                        style={styles.eventRowImage}
                                        contentFit="cover"
                                        cachePolicy="memory-disk"
                                    />
                                    <View style={styles.eventRowContent}>
                                        <Text style={styles.eventRowTitle} numberOfLines={1}>{event.title}</Text>
                                        <Text style={styles.eventRowDate}>
                                            {new Date(event.event_date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                                        </Text>
                                        <View style={styles.eventRowFooter}>
                                            <View style={styles.progressBarBg}>
                                                <View
                                                    style={[
                                                        styles.progressBarFill,
                                                        { width: `${Math.min((event.participants_count / (event.max_guests || 1)) * 100, 100)}%` }
                                                    ]}
                                                />
                                            </View>
                                            <Text style={styles.eventRowSpots}>
                                                {event.participants_count}/{event.max_guests}
                                            </Text>
                                        </View>
                                    </View>
                                    {event.pending_count > 0 && (
                                        <View style={styles.eventRowBadge}>
                                            <Text style={styles.eventRowBadgeText}>{event.pending_count}</Text>
                                        </View>
                                    )}
                                    <Ionicons name="chevron-forward" size={18} color="#CCC" />
                                </TouchableOpacity>
                            ))}
                    </View>
                )}

                {/* Past Events Summary */}
                {pastEvents.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Eventos Realizados</Text>
                            <TouchableOpacity onPress={() => router.push('/profile/my-events')}>
                                <Text style={styles.seeAllText}>Ver todos</Text>
                            </TouchableOpacity>
                        </View>
                        {pastEvents.slice(0, 3).map(event => (
                            <TouchableOpacity
                                key={event.id}
                                style={[styles.eventRow, { opacity: 0.7 }]}
                                onPress={() => router.push(`/events/${event.id}`)}
                                activeOpacity={0.7}
                            >
                                <Image
                                    source={{ uri: getOptimizedImageUrl(event.cover_image_url, { width: 120 }) || DEFAULT_PLACEHOLDER_IMAGE }}
                                    style={styles.eventRowImage}
                                    contentFit="cover"
                                    cachePolicy="memory-disk"
                                />
                                <View style={styles.eventRowContent}>
                                    <Text style={styles.eventRowTitle} numberOfLines={1}>{event.title}</Text>
                                    <Text style={styles.eventRowDate}>
                                        {new Date(event.event_date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                                        {' • '}{event.participants_count} participantes
                                    </Text>
                                </View>
                                <View style={styles.concludedTag}>
                                    <Text style={styles.concludedTagText}>Concluído</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <View style={{ height: 30 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: C.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // ── Header ──
    header: {
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 20,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    headerLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.6)',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
    },
    notifBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    notifBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: '#F59E0B',
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: C.headerBg,
    },
    notifBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 16,
        padding: 4,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
    },
    statBoxMiddle: {
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    statNumber: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FFF',
    },
    statLabel: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '500',
        marginTop: 2,
    },
    // ── Content ──
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    walletCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: C.accent,
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
    },
    walletLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    walletIconBg: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    walletLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: 'rgba(255,255,255,0.85)',
    },
    walletAmount: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
    },
    createBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF',
        borderWidth: 2,
        borderColor: C.primary,
        borderStyle: 'dashed',
        padding: 14,
        borderRadius: 16,
        marginBottom: 24,
    },
    createBtnText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: C.primary,
    },
    // ── Sections ──
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: C.textPrimary,
        marginBottom: 12,
    },
    seeAllText: {
        fontSize: 13,
        fontWeight: '600',
        color: C.accent,
        marginBottom: 12,
    },
    // ── Next Event Card ──
    nextEventCard: {
        borderRadius: 20,
        overflow: 'hidden',
        height: 180,
        marginBottom: 12,
    },
    nextEventImage: {
        width: '100%',
        height: '100%',
    },
    nextEventOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '65%',
        justifyContent: 'flex-end',
        padding: 16,
    },
    nextEventTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 6,
    },
    nextEventMeta: {
        flexDirection: 'row',
        gap: 16,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '500',
    },
    pendingBadgeFloat: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: '#F59E0B',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    pendingBadgeFloatText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: 'bold',
    },
    quickActions: {
        flexDirection: 'row',
        gap: 8,
    },
    quickActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 6,
        borderWidth: 1,
        borderColor: C.border,
    },
    quickActionText: {
        fontSize: 13,
        fontWeight: '600',
        color: C.textPrimary,
    },
    // ── Event Row ──
    eventRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 12,
        borderRadius: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: C.border,
    },
    eventRowImage: {
        width: 56,
        height: 56,
        borderRadius: 12,
        marginRight: 12,
    },
    eventRowContent: {
        flex: 1,
    },
    eventRowTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: C.textPrimary,
        marginBottom: 2,
    },
    eventRowDate: {
        fontSize: 12,
        color: C.textSecondary,
        marginBottom: 6,
    },
    eventRowFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    progressBarBg: {
        flex: 1,
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: C.accent,
        borderRadius: 2,
    },
    eventRowSpots: {
        fontSize: 11,
        color: C.textSecondary,
        fontWeight: '600',
    },
    eventRowBadge: {
        backgroundColor: '#FEF3C7',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    eventRowBadgeText: {
        color: '#F59E0B',
        fontSize: 12,
        fontWeight: 'bold',
    },
    concludedTag: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        marginRight: 8,
    },
    concludedTagText: {
        fontSize: 10,
        color: '#9CA3AF',
        fontWeight: '600',
    },
    // ── Onboarding ──
    onboardingHeader: {
        height: 160,
        justifyContent: 'center',
        alignItems: 'center',
    },
    onboardingContent: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 32,
        marginTop: -30,
    },
    onboardingIconBg: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: C.accentLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 3,
        borderColor: '#FFF',
    },
    onboardingTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: C.textPrimary,
        textAlign: 'center',
        marginBottom: 12,
    },
    onboardingBody: {
        fontSize: 14,
        color: C.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 28,
    },
    onboardingSteps: {
        width: '100%',
        marginBottom: 32,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    stepIconBg: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: C.accentLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    stepText: {
        fontSize: 14,
        color: C.textPrimary,
        fontWeight: '500',
        flex: 1,
    },
    createFirstBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.primary,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 16,
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    createFirstBtnText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF',
    },
});
