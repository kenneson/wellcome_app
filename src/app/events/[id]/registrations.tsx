import { registrationFlow } from '@/shared/lib/registrationFlow';
import { RegistrationStatus } from '@/entities/event/types';
import { eventService } from '@/services/api/EventService';
import { registrationService } from '@/services/api/RegistrationService';
import { chatService } from '@/services/api/ChatService';
import { DEFAULT_AVATAR_PLACEHOLDER } from '@/shared/lib/styles';
import { getOptimizedImageUrl } from '@/utils/imageOptimizer';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import { BrandSheet, BrandStackHeader } from '@/components/ui/wellcome';
import { BorderRadius, Palette, Spacing } from '@/shared/constants/theme';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EventRegistrationsScreen() {
    const { id, tab } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const requestedTab = Array.isArray(tab) ? tab[0] : tab;
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [event, setEvent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'confirmed' | 'pending' | 'closed'>(
        requestedTab === 'pending' ? 'pending' : 'confirmed'
    );
    const [searchQuery, setSearchQuery] = useState('');

    // Helper to open links

    const fetchData = React.useCallback(async (quiet = false) => {
        try {
            if (!quiet) setLoading(true);
            const [registrationsData, eventData] = await Promise.all([
                registrationService.getRegistrations(id as string),
                eventService.getEventById(id as string)
            ]);

            setRegistrations(registrationsData || []);
            setEvent(eventData);

            const isPaid = Number(eventData?.price || 0) > 0;
            const hasPendingRegistrations = (registrationsData || []).some((registration: any) => {
                const paymentConfirmed = registration.paymentStatus === 'CONFIRMED'
                    || registration.paymentStatus === 'PARTIALLY_REFUNDED';
                return registration.status === RegistrationStatus.PENDING
                    || registration.status === RegistrationStatus.WAITLIST
                    || (registration.status === RegistrationStatus.APPROVED && isPaid && !paymentConfirmed);
            });

            if (requestedTab === 'pending' || requestedTab === 'confirmed') {
                setActiveTab(requestedTab);
            } else {
                setActiveTab(hasPendingRegistrations ? 'pending' : 'confirmed');
            }
        } catch (error) {
            console.error('❌ Error fetching data:', error);
            Alert.alert('Erro', 'Não foi possível carregar os dados.');
        } finally {
            setLoading(false);
        }
    }, [id, requestedTab]);

    useFocusEffect(React.useCallback(() => {
        if (id) void fetchData();
        const timer = setInterval(() => { if (id) void fetchData(true); }, 15_000);
        return () => clearInterval(timer);
    }, [fetchData, id]));

    async function handleOpenChat(guestId: string) {
        try {
            const conversation = await chatService.open(id as string, guestId);
            router.push(`/messages/${conversation.id}` as any);
        } catch (error: any) {
            Alert.alert('Não foi possível abrir o chat', error?.message || 'Tente novamente.');
        }
    }

    async function handleApprove(registrationId: string) {
        setProcessingId(registrationId);
        try {

            const updatedRegistration = await registrationService.approveRegistration(registrationId);
            setRegistrations(prev => prev.map(r =>
                r.id === registrationId ? { ...r, ...updatedRegistration } : r
            ));
            Alert.alert(
                'Inscrição aprovada',
                'A participação está confirmada e o ingresso foi liberado. Valores pagos ficam retidos até 24 horas após o evento.'
            );
        } catch (error: any) {
            Alert.alert(
                'Não foi possível aprovar',
                error?.message === 'Event is full'
                    ? 'Todas as vagas já estão reservadas. Cancele uma aprovação ou aguarde a expiração de um pagamento.'
                    : error?.message || 'Falha ao aprovar inscrição.'
            );
        } finally {
            setProcessingId(null);
        }
    }

    async function handleReject(registrationId: string) {
        setProcessingId(registrationId);
        try {
            const updated = await registrationService.rejectRegistration(registrationId);
            setRegistrations(prev => prev.map(r =>
                r.id === registrationId ? { ...r, ...updated } : r
            ));
            Alert.alert('Inscrição recusada', registrationFlow(updated, Number(event?.price) > 0, true).description);
        } catch (error) {
            Alert.alert('Erro', 'Falha ao rejeitar inscrição.');
        } finally {
            setProcessingId(null);
        }
    }

    const isEventPast = useMemo(() => {
        if (!event?.eventDate) return false;
        return new Date(event.eventDate) < new Date();
    }, [event]);

    const isPaidEvent = Number(event?.price || 0) > 0;
    const requiresHostApproval = event?.requiresApproval === true
        || event?.accessType === 'OPEN_WITH_APPROVAL';
    const isPaymentConfirmed = (registration: any) =>
        registration.paymentStatus === 'CONFIRMED' || registration.paymentStatus === 'PARTIALLY_REFUNDED';
    const isFinalConfirmed = (registration: any) =>
        registration.status === RegistrationStatus.APPROVED && (!isPaidEvent || isPaymentConfirmed(registration));
    const isAwaitingPayment = (registration: any) =>
        isPaidEvent
        && !isPaymentConfirmed(registration)
        && (
            registration.status === RegistrationStatus.APPROVED
            || registration.status === RegistrationStatus.PENDING
        );
    const isPaymentExpired = (registration: any) =>
        registration.status === RegistrationStatus.EXPIRED
        || (
            isAwaitingPayment(registration)
            && registration.paymentDueAt
            // eslint-disable-next-line react-hooks/purity -- deadline is re-checked on every render by design
            && new Date(registration.paymentDueAt).getTime() <= Date.now()
        );
    const isAwaitingHostApproval = (registration: any) =>
        registration.status === RegistrationStatus.PENDING && requiresHostApproval && (!isPaidEvent || isPaymentConfirmed(registration));
    const isWaitlisted = (registration: any) =>
        registration.status === RegistrationStatus.WAITLIST;
    const getStatusLabel = (registration: any) => registrationFlow(registration, isPaidEvent, requiresHostApproval).label;
    const getStatusTone = (registration: any) => {
        if (isFinalConfirmed(registration)) {
            return { badge: styles.statusConfirmed, text: styles.textConfirmed };
        }
        if (isPaymentExpired(registration)) {
            return { badge: styles.statusPending, text: styles.textPending };
        }
        if (isAwaitingPayment(registration)) {
            return { badge: styles.statusPaymentPending, text: styles.textPaymentPending };
        }
        return { badge: styles.statusPending, text: styles.textPending };
    };
    const getStatusExplanation = (registration: any) => registrationFlow(registration, isPaidEvent, requiresHostApproval).description;
    const isClosed = (registration: any) => ['REJECTED', 'CANCELLED', 'EXPIRED'].includes(registration.status)
        || ['REFUNDED', 'CHARGEBACK'].includes(registration.paymentStatus);
    let filteredRegistrations = activeTab === 'closed'
        ? registrations.filter(isClosed)
        : activeTab === 'confirmed'
        ? registrations.filter(r => isFinalConfirmed(r))
        : registrations.filter(r =>
            r.status === RegistrationStatus.PENDING || isWaitlisted(r) || isAwaitingPayment(r)
        );

    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredRegistrations = filteredRegistrations.filter(r =>
            r.user?.fullName?.toLowerCase().includes(query) ||
            r.user?.username?.toLowerCase().includes(query)
        );
    }

    const confirmedCount = registrations.filter(r => isFinalConfirmed(r)).length;
    const pendingCount = registrations.filter(r =>
        r.status === RegistrationStatus.PENDING || isWaitlisted(r) || isAwaitingPayment(r)
    ).length;
    const stats = {
        confirmedCount,
        pendingCount,
        revenue: event ? confirmedCount * Number(event.price || 0) : 0,
        occupancy: event ? `${registrations.filter(r => isFinalConfirmed(r) || (r.status === 'PENDING' && isPaymentConfirmed(r))).length} / ${event.max_guests || event.maxGuests || 0}` : '0 / 0',
    };

    const renderItem = ({ item }: { item: any }) => {
        const confirmed = isFinalConfirmed(item);
        const awaitingPayment = isAwaitingPayment(item);
        const tone = getStatusTone(item);

        return (
            <View style={styles.card}>
                {/* Tappable profile area */}
                <TouchableOpacity
                    style={styles.cardHeader}
                    onPress={() => {
                        if (!item.user?.id) return;
                        router.dismiss();
                        setTimeout(() => router.push(`/profile/${item.user.id}` as any), 100);
                    }}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver perfil de ${item.user?.fullName ?? 'participante'}`}
                >
                    <Image
                        source={{ uri: getOptimizedImageUrl(item.user?.avatarUrl, { width: 100 }) || DEFAULT_AVATAR_PLACEHOLDER }}
                        style={styles.avatar}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                    />
                    <View style={styles.userInfo}>
                        <View style={[styles.statusBadge, tone.badge]}>
                            <Text style={[styles.statusText, tone.text]}>
                                {getStatusLabel(item).toUpperCase()}
                            </Text>
                        </View>
                        <Text style={styles.userName} numberOfLines={1}>{item.user?.fullName}</Text>

                        {item.user?.occupation && (
                            <Text style={styles.occupationText}>{item.user.occupation}</Text>
                        )}

                        {(item.user?.city || item.user?.neighborhood) && (
                            <View style={styles.locationRow}>
                                <Ionicons name="location-outline" size={12} color={Palette.muted} />
                                <Text style={styles.locationText}>
                                    {[item.user.city, item.user.neighborhood].filter(Boolean).join(' • ')}
                                </Text>
                            </View>
                        )}

                        <View style={styles.viewProfileRow}>
                            <Text style={styles.viewProfileText}>Ver perfil completo</Text>
                            <Ionicons name="chevron-forward" size={12} color={Palette.orangeDeep} />
                        </View>
                    </View>
                </TouchableOpacity>

                <View style={[
                    styles.statusExplanation,
                    confirmed
                        ? styles.statusExplanationConfirmed
                        : awaitingPayment
                            ? styles.statusExplanationPayment
                            : styles.statusExplanationPending,
                ]}>
                    <Ionicons
                        name={confirmed
                            ? 'checkmark-circle-outline'
                            : awaitingPayment ? 'card-outline' : 'time-outline'}
                        size={17}
                        color={confirmed
                            ? Palette.green
                            : awaitingPayment ? Palette.blue : Palette.orangeDeep}
                    />
                    <Text style={styles.statusExplanationText}>{getStatusExplanation(item)}</Text>
                </View>

                {/* Bio snippet */}
                {item.user?.bio && (
                    <View style={styles.bioSection}>
                        <Text style={styles.bioLabel}>Sobre</Text>
                        <Text style={styles.bioText} numberOfLines={2}>{item.user.bio}</Text>
                    </View>
                )}

                {/* Languages */}
                {item.user?.languages && item.user.languages.length > 0 && (
                    <View style={styles.tagsSection}>
                        <Ionicons name="globe-outline" size={14} color={Palette.muted} />
                        <Text style={styles.tagsText}>{item.user.languages.join(', ')}</Text>
                    </View>
                )}

                {/* Dietary Restrictions */}
                {item.user?.dietaryRestrictions && item.user.dietaryRestrictions.length > 0 && (
                    <View style={styles.warningBox}>
                        <Ionicons name="alert-circle" size={16} color={Palette.danger} />
                        <Text style={styles.warningText}>
                            Restrição alimentar: {item.user.dietaryRestrictions.join(', ')}
                        </Text>
                    </View>
                )}

                {/* Answers to questions */}
                {item.answers && item.answers.length > 0 && (
                    <View style={styles.answersSection}>
                        <Text style={styles.answersTitle}>Respostas</Text>
                        {item.answers.map((a: any, idx: number) => (
                            <View key={idx} style={styles.answerItem}>
                                <Text style={styles.questionText}>{a.question}</Text>
                                <Text style={styles.answerText}>{a.answer}</Text>
                            </View>
                        ))}
                    </View>
                )}

                <View style={styles.actions}>
                    {!isEventPast && !isClosed(item) && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.dangerButton, processingId === item.id && styles.disabledButton]}
                            disabled={processingId === item.id}
                            onPress={() => Alert.alert('Recusar inscrição?', isPaymentConfirmed(item) ? 'A vaga será liberada e o valor pago será devolvido integralmente ao participante.' : 'A inscrição será recusada.', [{ text: 'Voltar', style: 'cancel' }, { text: 'Recusar', style: 'destructive', onPress: () => void handleReject(item.id) }])}
                            accessibilityRole="button"
                            accessibilityState={{ disabled: processingId === item.id }}
                        >
                            <Ionicons name="close-circle-outline" size={18} color={Palette.danger} />
                            <Text style={[styles.actionButtonText, { color: Palette.danger }]}>
                                {item.status === RegistrationStatus.APPROVED ? 'Cancelar' : 'Recusar'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleOpenChat(item.userId || item.user?.id)}
                        accessibilityRole="button"
                        accessibilityLabel="Abrir chat"
                    >
                        <Ionicons name="chatbubble-outline" size={18} color={Palette.ink} />
                        <Text style={styles.actionButtonText}>Chat</Text>
                    </TouchableOpacity>

                    {!isEventPast && isAwaitingHostApproval(item) && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.primaryButton, processingId === item.id && styles.disabledButton]}
                            disabled={processingId === item.id}
                            onPress={() => handleApprove(item.id)}
                            accessibilityRole="button"
                            accessibilityState={{ disabled: processingId === item.id }}
                        >
                            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                            <Text style={[styles.actionButtonText, styles.primaryButtonText]}>Aprovar</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    const tabs = [
        { id: 'confirmed', label: 'Confirmados', count: stats.confirmedCount },
        { id: 'pending', label: 'Pendentes', count: stats.pendingCount },
        { id: 'closed', label: 'Encerrados', count: registrations.filter(isClosed).length },
    ] as const;

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <StatusBar barStyle="light-content" backgroundColor={Palette.orange} />

            <BrandStackHeader eyebrow="ANFITRIÃO" title="Gerenciar evento" backIcon="close">
                {event && (
                    <View style={styles.eventInfo}>
                        <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                        <View style={styles.eventDateContainer}>
                            <Ionicons name="calendar-outline" size={16} color={Palette.orangeOnBrand} />
                            <Text style={styles.eventDate}>
                                {new Date(event.eventDate).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })} • {new Date(event.eventDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                    </View>
                )}
            </BrandStackHeader>

            <BrandSheet>
                {/* Stats Card */}
                <View style={styles.statsCard}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>RECEITA</Text>
                        <Text style={styles.statValue}>
                            {event ? `R$ ${stats.revenue.toFixed(2).replace('.', ',')}` : 'R$ 0,00'}
                        </Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>OCUPAÇÃO</Text>
                        <Text style={styles.statValue}>{stats.occupancy}</Text>
                    </View>
                </View>

                {/* Tabs */}
                <View style={styles.tabsContainer} accessibilityRole="tablist">
                    {tabs.map((item) => {
                        const selected = activeTab === item.id;
                        const attention = item.id === 'pending' && stats.pendingCount > 0 && !selected;
                        return (
                            <TouchableOpacity
                                key={item.id}
                                style={[styles.tab, attention && styles.pendingTabAttention, selected && styles.activeTab]}
                                onPress={() => setActiveTab(item.id)}
                                accessibilityRole="tab"
                                accessibilityState={{ selected }}
                            >
                                <Text
                                    style={[styles.tabText, attention && styles.pendingTabText, selected && styles.activeTabText]}
                                    numberOfLines={1}
                                >
                                    {item.label} ({item.count})
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
                <View style={styles.flowInfo}>
                    <Ionicons name="information-circle-outline" size={20} color={Palette.orangeDeep} />
                    <View style={styles.flowInfoText}>
                        <Text style={styles.flowInfoTitle}>
                            {requiresHostApproval ? 'Fluxo: pagamento antes da aprovação' : 'Fluxo: inscrição imediata'}
                        </Text>
                        <Text style={styles.flowInfoDescription}>
                            {requiresHostApproval
                                ? isPaidEvent
                                    ? 'O participante paga primeiro e a vaga fica reservada. Você aprova para liberar o ingresso ou recusa para iniciar o estorno integral.'
                                    : 'A vaga fica confirmada quando você aprovar a solicitação.'
                                : isPaidEvent
                                    ? 'Este evento tem inscrição imediata. A vaga fica confirmada automaticamente quando o pagamento for recebido.'
                                    : 'Este evento tem inscrição imediata e gratuita. A vaga é confirmada no momento da inscrição.'}
                        </Text>
                    </View>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={20} color={Palette.muted} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar participante..."
                        placeholderTextColor={Palette.subtle}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        accessibilityLabel="Buscar participante"
                    />
                </View>

                {/* List */}
                {loading ? (
                    <ActivityIndicator size="large" color={Palette.orange} style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        data={filteredRegistrations}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + Spacing.xxxl }]}
                        showsVerticalScrollIndicator={false}
                        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                        keyboardShouldPersistTaps="handled"
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <View style={styles.emptyIcon}>
                                    <Ionicons name="people-outline" size={30} color={Palette.orangeDeep} />
                                </View>
                                <Text style={styles.emptyStateText}>
                                    Nenhum participante encontrado.
                                </Text>
                            </View>
                        }
                    />
                )}
            </BrandSheet>
        </KeyboardAvoidingView>
    );
}

const softBox = {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: 10,
} as const;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Palette.paper,
    },
    eventInfo: {
        gap: 6,
    },
    eventTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#FFFFFF',
        lineHeight: 24,
    },
    eventDateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    eventDate: {
        color: Palette.orangeOnBrand,
        fontSize: 14,
        fontWeight: '600',
    },
    statsCard: {
        flexDirection: 'row',
        backgroundColor: Palette.surface,
        marginHorizontal: Spacing.xl,
        marginTop: Spacing.lg,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        backgroundColor: Palette.line,
        marginHorizontal: 10,
    },
    statLabel: {
        fontSize: 11,
        color: Palette.muted,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '800',
        color: Palette.ink,
    },
    tabsContainer: {
        flexDirection: 'row',
        gap: 4,
        marginBottom: Spacing.md,
        backgroundColor: Palette.track,
        marginHorizontal: Spacing.xl,
        borderRadius: BorderRadius.full,
        padding: 4,
    },
    tab: {
        flex: 1,
        minHeight: 40,
        paddingHorizontal: 4,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: BorderRadius.full,
    },
    pendingTabAttention: {
        backgroundColor: Palette.orangeSoft,
    },
    activeTab: {
        backgroundColor: Palette.surface,
        shadowColor: Palette.ink,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
    },
    tabText: {
        fontSize: 13,
        color: Palette.inkSoft,
        fontWeight: '700',
    },
    activeTabText: {
        color: Palette.ink,
        fontWeight: '800',
    },
    pendingTabText: {
        color: Palette.orangeDarker,
        fontWeight: '800',
    },
    flowInfo: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: Palette.orangeSoft,
        borderRadius: BorderRadius.lg,
        marginHorizontal: Spacing.xl,
        marginBottom: Spacing.md,
        padding: Spacing.md,
        gap: Spacing.sm,
    },
    flowInfoText: {
        flex: 1,
    },
    flowInfoTitle: {
        color: Palette.orangeDarker,
        fontSize: 14,
        fontWeight: '800',
    },
    flowInfoDescription: {
        color: Palette.inkSoft,
        fontSize: 12,
        lineHeight: 18,
        marginTop: 3,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Palette.surface,
        marginHorizontal: Spacing.xl,
        paddingHorizontal: Spacing.lg,
        minHeight: 48,
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Palette.line,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        paddingVertical: Spacing.md,
        fontSize: 15,
        color: Palette.ink,
    },
    listContent: {
        paddingHorizontal: Spacing.xl,
        gap: Spacing.md,
    },
    card: {
        backgroundColor: Palette.surface,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        padding: 14,
    },
    cardHeader: {
        flexDirection: 'row',
        marginBottom: Spacing.md,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Palette.track,
    },
    userInfo: {
        flex: 1,
        marginLeft: Spacing.md,
        gap: 2,
    },
    userName: {
        fontSize: 16,
        fontWeight: '800',
        color: Palette.ink,
        marginTop: 4,
    },
    occupationText: {
        fontSize: 13,
        color: Palette.inkSoft,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    locationText: {
        fontSize: 12,
        color: Palette.muted,
    },
    viewProfileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        marginTop: 2,
    },
    viewProfileText: {
        fontSize: 12,
        color: Palette.orangeDeep,
        fontWeight: '800',
    },
    bioSection: {
        ...softBox,
        backgroundColor: Palette.paper,
    },
    bioLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: Palette.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 4,
    },
    bioText: {
        fontSize: 13,
        color: Palette.inkSoft,
        lineHeight: 19,
    },
    tagsSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
        paddingHorizontal: 2,
    },
    tagsText: {
        fontSize: 13,
        color: Palette.inkSoft,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: BorderRadius.full,
    },
    statusConfirmed: {
        backgroundColor: Palette.greenSoft,
    },
    statusPending: {
        backgroundColor: Palette.orangeSoft,
    },
    statusPaymentPending: {
        backgroundColor: Palette.blueSoft,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.4,
    },
    textConfirmed: {
        color: Palette.green,
    },
    textPending: {
        color: Palette.orangeDarker,
    },
    textPaymentPending: {
        color: Palette.blue,
    },
    statusExplanation: {
        ...softBox,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
    },
    statusExplanationConfirmed: {
        backgroundColor: Palette.greenSoft,
    },
    statusExplanationPayment: {
        backgroundColor: Palette.blueSoft,
    },
    statusExplanationPending: {
        backgroundColor: Palette.orangeSoft,
    },
    statusExplanationText: {
        flex: 1,
        color: Palette.inkSoft,
        fontSize: 12,
        lineHeight: 18,
    },
    warningBox: {
        ...softBox,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Palette.surface,
        borderWidth: 1,
        borderColor: Palette.dangerLine,
    },
    warningText: {
        fontSize: 12,
        fontWeight: '700',
        color: Palette.danger,
        marginLeft: 6,
        flex: 1,
    },
    answersSection: {
        ...softBox,
        backgroundColor: Palette.paper,
    },
    answersTitle: {
        fontSize: 11,
        fontWeight: '800',
        color: Palette.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: Spacing.sm,
    },
    answerItem: {
        marginBottom: Spacing.sm,
    },
    questionText: {
        fontSize: 12,
        fontWeight: '700',
        color: Palette.inkSoft,
        marginBottom: 2,
    },
    answerText: {
        fontSize: 13,
        color: Palette.ink,
        lineHeight: 19,
    },
    actions: {
        flexDirection: 'row',
        gap: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Palette.lineSoft,
        paddingTop: Spacing.md,
        marginTop: 2,
    },
    actionButton: {
        flex: 1,
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Palette.line,
        backgroundColor: Palette.surface,
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '800',
        color: Palette.ink,
    },
    dangerButton: {
        borderColor: Palette.dangerLine,
    },
    primaryButton: {
        backgroundColor: Palette.orange,
        borderColor: Palette.orange,
    },
    primaryButtonText: {
        color: '#FFFFFF',
    },
    disabledButton: {
        opacity: 0.6,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: Spacing.xxxl,
        gap: Spacing.md,
    },
    emptyIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Palette.orangeSoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyStateText: {
        color: Palette.inkSoft,
        fontSize: 14,
    },
});
