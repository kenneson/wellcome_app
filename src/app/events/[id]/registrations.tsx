import { registrationFlow } from '@/shared/lib/registrationFlow';
import { RegistrationStatus } from '@/entities/event/types';
import { eventService } from '@/services/api/EventService';
import { registrationService } from '@/services/api/RegistrationService';
import { chatService } from '@/services/api/ChatService';
import { DEFAULT_AVATAR_PLACEHOLDER } from '@/shared/lib/styles';
import { getOptimizedImageUrl } from '@/utils/imageOptimizer';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EventRegistrationsScreen() {
    const { id, tab } = useLocalSearchParams();
    const router = useRouter();
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

    const renderItem = ({ item }: { item: any }) => (
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
            >
                <Image
                    source={{ uri: getOptimizedImageUrl(item.user?.avatarUrl, { width: 100 }) || DEFAULT_AVATAR_PLACEHOLDER }}
                    style={styles.avatar}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                />
                <View style={styles.userInfo}>
                    <View style={styles.headerTop}>
                        <Text style={styles.userName}>{item.user?.fullName}</Text>
                        <View style={[styles.statusBadge, getStatusTone(item).badge]}>
                            <Text style={[styles.statusText, getStatusTone(item).text]}>
                                {getStatusLabel(item)}
                            </Text>
                        </View>
                    </View>
                    
                    {item.user?.occupation && (
                        <Text style={styles.occupationText}>{item.user.occupation}</Text>
                    )}

                    {(item.user?.city || item.user?.neighborhood) && (
                        <View style={styles.locationRow}>
                            <Ionicons name="location-outline" size={12} color="#9CA3AF" />
                            <Text style={styles.locationText}>
                                {[item.user.city, item.user.neighborhood].filter(Boolean).join(' • ')}
                            </Text>
                        </View>
                    )}

                    <View style={styles.viewProfileRow}>
                        <Ionicons name="person-circle-outline" size={14} color="#FF8C42" />
                        <Text style={styles.viewProfileText}>Ver perfil completo</Text>
                        <Ionicons name="chevron-forward" size={12} color="#FF8C42" />
                    </View>
                </View>
            </TouchableOpacity>

            <View style={[
                styles.statusExplanation,
                isFinalConfirmed(item)
                    ? styles.statusExplanationConfirmed
                    : isAwaitingPayment(item)
                        ? styles.statusExplanationPayment
                        : styles.statusExplanationPending,
            ]}>
                <Ionicons
                    name={isFinalConfirmed(item)
                        ? 'checkmark-circle-outline'
                        : isAwaitingPayment(item) ? 'card-outline' : 'time-outline'}
                    size={17}
                    color={isFinalConfirmed(item)
                        ? '#166534'
                        : isAwaitingPayment(item) ? '#1D4ED8' : '#9A4819'}
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
                    <Ionicons name="globe-outline" size={14} color="#6B7280" />
                    <Text style={styles.tagsText}>{item.user.languages.join(', ')}</Text>
                </View>
            )}

            {/* Dietary Restrictions */}
            {item.user?.dietaryRestrictions && item.user.dietaryRestrictions.length > 0 && (
                <View style={styles.warningBox}>
                    <Ionicons name="alert-circle" size={16} color="#B45309" />
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
                        style={styles.secondaryButton}
                        disabled={processingId === item.id}
                        onPress={() => Alert.alert('Recusar inscrição?', isPaymentConfirmed(item) ? 'A vaga será liberada e o valor pago será devolvido integralmente ao participante.' : 'A inscrição será recusada.', [{ text: 'Voltar', style: 'cancel' }, { text: 'Recusar', style: 'destructive', onPress: () => void handleReject(item.id) }])}
                    >
                        <Ionicons 
                            name="close-circle-outline"
                            size={18} 
                            color="#666" 
                        />
                        <Text style={styles.secondaryButtonText}>
                            {item.status === RegistrationStatus.APPROVED ? 'Cancelar' : 'Recusar'}
                        </Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[styles.secondaryButton, styles.contactButton]}
                    onPress={() => handleOpenChat(item.userId || item.user?.id)}
                >
                    <Ionicons name="chatbubble-outline" size={18} color="#FF8C42" />
                    <Text style={[styles.secondaryButtonText, { color: '#FF8C42' }]}>Chat</Text>
                </TouchableOpacity>

                {!isEventPast && isAwaitingHostApproval(item) && (
                    <TouchableOpacity 
                        style={styles.primaryButton}
                        disabled={processingId === item.id}
                        onPress={() => handleApprove(item.id)}
                    >
                        <Text style={styles.primaryButtonText}>Aprovar</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <StatusBar barStyle="light-content" backgroundColor="#FF8C42" />
            
            {/* Orange Header Background */}
            <View style={styles.headerBackground}>
                <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Gerenciar Evento</Text>
                        <TouchableOpacity style={styles.moreButton}>
                            <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {event && (
                        <View style={styles.eventInfo}>
                            <Text style={styles.eventTitle}>{event.title}</Text>
                            <View style={styles.eventDateContainer}>
                                <Ionicons name="calendar-outline" size={16} color="#fff" />
                                <Text style={styles.eventDate}>
                                    {new Date(event.eventDate).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })} • {new Date(event.eventDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                        </View>
                    )}
                </SafeAreaView>
            </View>

            {/* Content Body */}
            <View style={styles.contentBody}>
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
                <View style={styles.tabsContainer}>
                    <TouchableOpacity 
                        style={[styles.tab, activeTab === 'confirmed' && styles.activeTab]}
                        onPress={() => setActiveTab('confirmed')}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: activeTab === 'confirmed' }}
                    >
                        <Text style={[styles.tabText, activeTab === 'confirmed' && styles.activeTabText]}>
                            Confirmados ({stats.confirmedCount})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[
                            styles.tab,
                            stats.pendingCount > 0 && activeTab !== 'pending' && styles.pendingTabAttention,
                            activeTab === 'pending' && styles.activeTab,
                        ]}
                        onPress={() => setActiveTab('pending')}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: activeTab === 'pending' }}
                    >
                        <Text style={[
                            styles.tabText,
                            stats.pendingCount > 0 && activeTab !== 'pending' && styles.pendingTabText,
                            activeTab === 'pending' && styles.activeTabText,
                        ]}>
                            Pendentes ({stats.pendingCount})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'closed' && styles.activeTab]}
                        onPress={() => setActiveTab('closed')}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: activeTab === 'closed' }}
                    >
                        <Text style={[styles.tabText, activeTab === 'closed' && styles.activeTabText]}>
                            Encerrados ({registrations.filter(isClosed).length})
                        </Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.flowInfo}>
                    <Ionicons name="information-circle-outline" size={21} color="#9A4819" />
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
                    <Ionicons name="search-outline" size={20} color="#9CA3AF" />
                    <TextInput 
                        style={styles.searchInput}
                        placeholder="Buscar participante..."
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    <TouchableOpacity>
                        <Ionicons name="filter-outline" size={20} color="#4B5563" />
                    </TouchableOpacity>
                </View>

                {/* List */}
                {loading ? (
                    <ActivityIndicator size="large" color="#FF8C42" style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        data={filteredRegistrations}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                        keyboardShouldPersistTaps="handled"
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyStateText}>
                                    Nenhum participante encontrado.
                                </Text>
                            </View>
                        }
                    />
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    headerBackground: {
        backgroundColor: '#FF8C42',
        paddingBottom: 80, // Space for stats card overlap
    },
    headerSafeArea: {
        // backgroundColor: '#FF8C42',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        padding: 4,
    },
    moreButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    eventInfo: {
        paddingHorizontal: 20,
        marginTop: 10,
    },
    eventTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
        lineHeight: 28,
    },
    eventDateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    eventDate: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        marginLeft: 6,
    },
    contentBody: {
        flex: 1,
        marginTop: -60, // Overlap the header
    },
    statsCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        marginBottom: 20,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 10,
    },
    statLabel: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '600',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 16,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 16,
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        minHeight: 44,
        paddingVertical: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
    },
    pendingTabAttention: {
        backgroundColor: '#FFF7ED',
        borderWidth: 1,
        borderColor: '#FDBA74',
    },
    activeTab: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    activeTabText: {
        color: '#FF8C42',
        fontWeight: '700',
    },
    pendingTabText: {
        color: '#9A4819',
        fontWeight: '700',
    },
    flowInfo: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#FFF7ED',
        borderWidth: 1,
        borderColor: '#FDBA74',
        borderRadius: 14,
        marginHorizontal: 16,
        marginBottom: 14,
        padding: 13,
        gap: 9,
    },
    flowInfoText: {
        flex: 1,
    },
    flowInfoTitle: {
        color: '#9A4819',
        fontSize: 14,
        fontWeight: '800',
    },
    flowInfoDescription: {
        color: '#7C421F',
        fontSize: 12,
        lineHeight: 18,
        marginTop: 3,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 15,
        color: '#1F2937',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 30,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#F3F4F6',
    },
    userInfo: {
        flex: 1,
        marginLeft: 12,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
        flex: 1,
        marginRight: 8,
    },
    occupationText: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 2,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        marginBottom: 4,
    },
    locationText: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    viewProfileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        marginTop: 4,
    },
    viewProfileText: {
        fontSize: 12,
        color: '#FF8C42',
        fontWeight: '600',
    },
    bioSection: {
        backgroundColor: '#F9FAFB',
        borderRadius: 10,
        padding: 10,
        marginBottom: 10,
    },
    bioLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    bioText: {
        fontSize: 13,
        color: '#4B5563',
        lineHeight: 18,
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
        color: '#6B7280',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusConfirmed: {
        backgroundColor: '#DCFCE7', // Green-100
    },
    statusPending: {
        backgroundColor: '#FFEDD5', // Orange-100
    },
    statusPaymentPending: {
        backgroundColor: '#DBEAFE',
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    textConfirmed: {
        color: '#166534', // Green-800
    },
    textPending: {
        color: '#C2410C',
    },
    textPaymentPending: {
        color: '#1D4ED8',
    },
    statusExplanation: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 7,
        padding: 10,
        borderRadius: 10,
        marginBottom: 10,
    },
    statusExplanationConfirmed: {
        backgroundColor: '#F0FDF4',
    },
    statusExplanationPayment: {
        backgroundColor: '#EFF6FF',
    },
    statusExplanationPending: {
        backgroundColor: '#FFF7ED',
    },
    statusExplanationText: {
        flex: 1,
        color: '#4B5563',
        fontSize: 12,
        lineHeight: 17,
    },
    warningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        padding: 8,
        borderRadius: 8,
        marginBottom: 10,
    },
    warningText: {
        fontSize: 12,
        color: '#92400E',
        marginLeft: 6,
        flex: 1,
    },
    answersSection: {
        backgroundColor: '#F0F9FF',
        borderRadius: 10,
        padding: 12,
        marginBottom: 10,
    },
    answersTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#3B82F6',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    answerItem: {
        marginBottom: 8,
    },
    questionText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4B5563',
        marginBottom: 2,
    },
    answerText: {
        fontSize: 13,
        color: '#1F2937',
        lineHeight: 18,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingTop: 12,
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
    },
    secondaryButtonText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6B7280',
        marginLeft: 4,
    },
    contactButton: {
        marginRight: 0,
    },
    primaryButton: {
        backgroundColor: '#FF8C42',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        marginLeft: 16,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
    },
    emptyStateText: {
        color: '#9CA3AF',
        fontSize: 14,
    },
});
