import { AppIcon } from '@/components/ui/icon';
import { EventDraftRecord, eventDraftService } from '@/services/api/EventDraftService';
import { eventService } from '@/services/api/EventService';
import { BorderRadius, Colors, Dimensions, Spacing } from '@/shared/constants/theme';
import { getEventStart, isEventRegistrationClosed } from '@/shared/lib/eventAvailability';
import { DEFAULT_PLACEHOLDER_IMAGE } from '@/shared/lib/styles';
import { supabase } from '@/shared/lib/supabase';
import { formatPrice } from '@/utils/formatters';
import { getOptimizedImageUrl } from '@/utils/imageOptimizer';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type DashboardFilter = 'overview' | 'attention' | 'upcoming' | 'drafts' | 'past';

type RegistrationSummary = {
    status: string;
};

type HostEvent = {
    id: string;
    title: string;
    price: number | string;
    max_guests: number;
    event_date?: string | null;
    end_time?: string | null;
    reservation_deadline?: string | null;
    cover_image_url?: string | null;
    city?: string | null;
    state?: string | null;
    event_participants?: RegistrationSummary[];
    active_registration_count: number;
    pending_registration_count: number;
    approved_registration_count: number;
};

type DashboardRow =
    | { kind: 'event'; id: string; event: HostEvent }
    | { kind: 'draft'; id: string; draft: EventDraftRecord };

type FilterDefinition = {
    id: DashboardFilter;
    label: string;
};

const FILTERS: FilterDefinition[] = [
    { id: 'overview', label: 'Visão geral' },
    { id: 'attention', label: 'Pendências' },
    { id: 'upcoming', label: 'Próximos' },
    { id: 'drafts', label: 'Rascunhos' },
    { id: 'past', label: 'Encerrados' },
];

const DRAFT_STEP_ROUTES = [
    '/events/create',
    '/events/create/menu',
    '/events/create/location',
    '/events/create/details',
    '/events/create/settings',
] as const;

const palette = {
    canvas: '#F7F7F8',
    surface: Colors.light.card,
    primary: Colors.light.primary,
    primarySoft: '#FFF1E8',
    text: '#1C2430',
    muted: '#697386',
    subtle: '#98A2B3',
    border: '#E7E9ED',
    success: '#237A4B',
    successSoft: '#EAF7F0',
    warning: Colors.light.primary,
    warningSoft: '#FFF4E8',
    danger: '#B42318',
};

function normalizeSearch(value: string) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('pt-BR')
        .trim();
}

function formatEventDate(event: HostEvent) {
    const date = getEventStart(event);
    if (!date || Number.isNaN(date.getTime())) return 'Data a confirmar';

    return date.toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
    }).replace('.', '');
}

function eventLocation(event: HostEvent) {
    const location = [event.city, event.state].filter(Boolean).join(' · ');
    return location || 'Localização a confirmar';
}

function filterTitle(filter: DashboardFilter) {
    const titles: Record<DashboardFilter, string> = {
        overview: 'Todos os seus eventos',
        attention: 'Precisam da sua atenção',
        upcoming: 'Próximos eventos',
        drafts: 'Continue de onde parou',
        past: 'Eventos encerrados',
    };
    return titles[filter];
}

function filterDescription(filter: DashboardFilter) {
    const descriptions: Record<DashboardFilter, string> = {
        overview: 'Acompanhe inscrições, ocupação e próximos passos.',
        attention: 'Revise solicitações para não deixar convidados esperando.',
        upcoming: 'Prepare e acompanhe as próximas experiências.',
        drafts: 'Finalize os eventos que ainda não foram publicados.',
        past: 'Consulte eventos que já aconteceram ou fecharam inscrições.',
    };
    return descriptions[filter];
}

export default function HostEventsScreen() {
    const router = useRouter();
    const [events, setEvents] = useState<HostEvent[]>([]);
    const [drafts, setDrafts] = useState<EventDraftRecord[]>([]);
    const [selectedFilter, setSelectedFilter] = useState<DashboardFilter>('overview');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const loadDashboard = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
        if (mode === 'initial') {
            setLoading(true);
        } else {
            setRefreshing(true);
        }
        setErrorMessage(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Sua sessão expirou. Entre novamente para gerenciar os eventos.');

            const draftRequest = eventDraftService.list().catch(() => [] as EventDraftRecord[]);
            const { data, error } = await supabase
                .from('events')
                .select(`
                    *,
                    event_participants(status)
                `)
                .eq('host_id', session.user.id)
                .order('event_date', { ascending: false });

            if (error) throw error;

            const formattedEvents = (data ?? []).map((rawEvent: any): HostEvent => {
                const registrations = (rawEvent.event_participants ?? []) as RegistrationSummary[];
                const activeStatuses = new Set(['PENDING', 'APPROVED', 'WAITLIST']);

                return {
                    ...rawEvent,
                    active_registration_count: registrations.filter((item) => activeStatuses.has(item.status)).length,
                    pending_registration_count: registrations.filter((item) => item.status === 'PENDING').length,
                    approved_registration_count: registrations.filter((item) => item.status === 'APPROVED').length,
                };
            });

            setEvents(formattedEvents);
            setDrafts(await draftRequest);
        } catch (error: any) {
            setErrorMessage(error?.message || 'Não foi possível carregar seus eventos.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => {
        void loadDashboard('initial');
    }, [loadDashboard]));

    const stats = useMemo(() => {
        const now = new Date();
        const upcoming = events.filter((event) => !isEventRegistrationClosed(event, now)).length;
        const pending = events.reduce((total, event) => total + event.pending_registration_count, 0);
        const approved = events.reduce((total, event) => total + event.approved_registration_count, 0);
        return { upcoming, pending, approved, drafts: drafts.length };
    }, [drafts.length, events]);

    const rows = useMemo<DashboardRow[]>(() => {
        const query = normalizeSearch(search);
        const now = new Date();

        const matchingEvents = events
            .filter((event) => {
                if (selectedFilter === 'drafts') return false;

                const isPast = isEventRegistrationClosed(event, now);
                if (selectedFilter === 'attention' && event.pending_registration_count === 0) return false;
                if (selectedFilter === 'upcoming' && isPast) return false;
                if (selectedFilter === 'past' && !isPast) return false;

                if (!query) return true;
                return normalizeSearch(`${event.title} ${event.city ?? ''} ${event.state ?? ''}`).includes(query);
            })
            .sort((first, second) => {
                if (selectedFilter === 'overview') {
                    const pendingDifference = second.pending_registration_count - first.pending_registration_count;
                    if (pendingDifference !== 0) return pendingDifference;
                }
                const firstDate = getEventStart(first)?.getTime() ?? 0;
                const secondDate = getEventStart(second)?.getTime() ?? 0;
                return selectedFilter === 'past' ? secondDate - firstDate : firstDate - secondDate;
            })
            .map((event) => ({ kind: 'event' as const, id: `event-${event.id}`, event }));

        const matchingDrafts = drafts
            .filter((draft) => {
                if (selectedFilter !== 'overview' && selectedFilter !== 'drafts') return false;
                if (!query) return true;
                const title = String((draft.payload as any).details?.title ?? 'Evento em criação');
                return normalizeSearch(title).includes(query);
            })
            .map((draft) => ({ kind: 'draft' as const, id: `draft-${draft.id}`, draft }));

        if (selectedFilter === 'drafts') return matchingDrafts;
        if (selectedFilter === 'overview') return [...matchingDrafts, ...matchingEvents];
        return matchingEvents;
    }, [drafts, events, search, selectedFilter]);

    const selectFilter = useCallback((filter: DashboardFilter) => {
        setSelectedFilter(filter);
    }, []);

    const handleDeleteEvent = useCallback((event: HostEvent) => {
        Alert.alert(
            'Cancelar evento?',
            `O evento “${event.title}” será cancelado. Se houver vendas, as regras de reembolso serão aplicadas.`,
            [
                { text: 'Voltar', style: 'cancel' },
                {
                    text: 'Cancelar evento',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await eventService.deleteEvent(event.id);
                            setEvents((current) => current.filter((item) => item.id !== event.id));
                        } catch (error: any) {
                            Alert.alert('Não foi possível cancelar', error?.message || 'Tente novamente.');
                        }
                    },
                },
            ],
        );
    }, []);

    const handleDeleteDraft = useCallback((draft: EventDraftRecord) => {
        Alert.alert('Excluir rascunho?', 'As informações salvas neste rascunho serão removidas.', [
            { text: 'Voltar', style: 'cancel' },
            {
                text: 'Excluir',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await eventDraftService.delete(draft.id);
                        const cover = (draft.payload as any).details?.coverImage;
                        if (cover) await eventService.deleteUploadedImage(cover);
                        await eventDraftService.removeLocal(draft.id);
                        setDrafts((current) => current.filter((item) => item.id !== draft.id));
                    } catch (error: any) {
                        Alert.alert('Não foi possível excluir', error?.message || 'Tente novamente.');
                    }
                },
            },
        ]);
    }, []);

    const renderEvent = useCallback((event: HostEvent) => (
        <EventCard
            event={event}
            onOpen={() => router.push(`/events/${event.id}`)}
            onEdit={() => router.push(`/events/${event.id}/edit`)}
            onRegistrations={() => router.push((`/events/${event.id}/registrations?tab=${event.pending_registration_count > 0 ? 'pending' : 'confirmed'}`) as any)}
            onDelete={() => handleDeleteEvent(event)}
        />
    ), [handleDeleteEvent, router]);

    const renderDraft = useCallback((draft: EventDraftRecord) => (
        <DraftCard
            draft={draft}
            onContinue={(step) => router.push({
                pathname: DRAFT_STEP_ROUTES[step],
                params: { draftId: draft.id },
            } as any)}
            onDelete={() => handleDeleteDraft(draft)}
        />
    ), [handleDeleteDraft, router]);

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <View style={styles.topBar}>
                <View style={styles.titleGroup}>
                    <Text style={styles.eyebrow}>CENTRAL DO ANFITRIÃO</Text>
                    <Text style={styles.screenTitle}>Eventos</Text>
                </View>
                <View style={styles.topActions}>
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => router.push('/notifications')}
                        accessibilityRole="button"
                        accessibilityLabel="Abrir notificações"
                    >
                        <AppIcon name="notifications-outline" size={Dimensions.icon.large} color={palette.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.createButton}
                        onPress={() => router.push('/events/create')}
                        accessibilityRole="button"
                        accessibilityLabel="Criar novo evento"
                    >
                        <AppIcon name="add" size={20} color="#FFFFFF" />
                        <Text style={styles.createButtonText}>Criar</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={rows}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => item.kind === 'event' ? renderEvent(item.event) : renderDraft(item.draft)}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={(
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => void loadDashboard('refresh')}
                        tintColor={palette.primary}
                        colors={[palette.primary]}
                    />
                )}
                ListHeaderComponent={loading ? null : (
                    <DashboardHeader
                        stats={stats}
                        selectedFilter={selectedFilter}
                        search={search}
                        errorMessage={errorMessage}
                        onSearch={setSearch}
                        onSelectFilter={selectFilter}
                        onRetry={() => void loadDashboard('initial')}
                    />
                )}
                ListEmptyComponent={loading ? (
                    <LoadingState />
                ) : (
                    <EmptyState
                        filter={selectedFilter}
                        hasSearch={search.trim().length > 0}
                        onCreate={() => router.push('/events/create')}
                        onClearSearch={() => setSearch('')}
                    />
                )}
            />
        </SafeAreaView>
    );
}

type DashboardHeaderProps = {
    stats: { upcoming: number; pending: number; approved: number; drafts: number };
    selectedFilter: DashboardFilter;
    search: string;
    errorMessage: string | null;
    onSearch: (value: string) => void;
    onSelectFilter: (filter: DashboardFilter) => void;
    onRetry: () => void;
};

function DashboardHeader({
    stats,
    selectedFilter,
    search,
    errorMessage,
    onSearch,
    onSelectFilter,
    onRetry,
}: DashboardHeaderProps) {
    return (
        <>
            {stats.pending > 0 ? (
                <TouchableOpacity
                    style={styles.attentionCard}
                    onPress={() => onSelectFilter('attention')}
                    accessibilityRole="button"
                    accessibilityLabel={`${stats.pending} inscrições aguardando sua análise`}
                    accessibilityHint="Mostrar eventos com inscrições pendentes"
                >
                    <View style={styles.attentionIcon}>
                        <AppIcon name="person-add-outline" size={24} color={palette.warning} />
                    </View>
                    <View style={styles.attentionCopy}>
                        <Text style={styles.attentionKicker}>PRECISA DE VOCÊ</Text>
                        <Text style={styles.attentionTitle}>
                            {stats.pending} {stats.pending === 1 ? 'inscrição aguardando' : 'inscrições aguardando'}
                        </Text>
                        <Text style={styles.attentionDescription}>Revise agora e dê um retorno aos convidados.</Text>
                    </View>
                    <View style={styles.attentionArrow}>
                        <AppIcon name="chevron-forward" size={20} color={palette.warning} />
                    </View>
                </TouchableOpacity>
            ) : !errorMessage ? (
                <View style={styles.allGoodCard}>
                    <View style={styles.allGoodIcon}>
                        <AppIcon name="checkmark-circle" size={22} color={palette.success} />
                    </View>
                    <View style={styles.attentionCopy}>
                        <Text style={styles.allGoodTitle}>Tudo em dia por aqui</Text>
                        <Text style={styles.allGoodDescription}>Nenhuma inscrição precisa da sua análise agora.</Text>
                    </View>
                </View>
            ) : null}

            <View style={styles.metricsRow}>
                <MetricCard
                    label="Próximos"
                    value={stats.upcoming}
                    icon="calendar-outline"
                    selected={selectedFilter === 'upcoming'}
                    onPress={() => onSelectFilter('upcoming')}
                />
                <MetricCard
                    label="Aprovados"
                    value={stats.approved}
                    icon="people-outline"
                    selected={false}
                    onPress={() => onSelectFilter('overview')}
                />
                <MetricCard
                    label="Rascunhos"
                    value={stats.drafts}
                    icon="document-text-outline"
                    selected={selectedFilter === 'drafts'}
                    onPress={() => onSelectFilter('drafts')}
                />
            </View>

            {errorMessage && (
                <View style={styles.errorCard} accessibilityRole="alert">
                    <AppIcon name="cloud-offline-outline" size={22} color={palette.danger} />
                    <View style={styles.errorCopy}>
                        <Text style={styles.errorTitle}>Não foi possível atualizar</Text>
                        <Text style={styles.errorDescription}>{errorMessage}</Text>
                    </View>
                    <TouchableOpacity style={styles.retryButton} onPress={onRetry} accessibilityRole="button">
                        <Text style={styles.retryButtonText}>Tentar</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.searchBox}>
                <AppIcon name="search-outline" size={20} color={palette.muted} />
                <TextInput
                    value={search}
                    onChangeText={onSearch}
                    placeholder="Buscar por nome ou cidade"
                    placeholderTextColor={palette.subtle}
                    style={styles.searchInput}
                    returnKeyType="search"
                    clearButtonMode="while-editing"
                    accessibilityLabel="Buscar meus eventos"
                />
                {!!search && (
                    <TouchableOpacity
                        style={styles.clearSearchButton}
                        onPress={() => onSearch('')}
                        accessibilityRole="button"
                        accessibilityLabel="Limpar busca"
                    >
                        <AppIcon name="close-circle" size={20} color={palette.muted} />
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                horizontal
                data={FILTERS}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                    const selected = item.id === selectedFilter;
                    const count = item.id === 'attention'
                        ? stats.pending
                        : item.id === 'upcoming'
                            ? stats.upcoming
                            : item.id === 'drafts'
                                ? stats.drafts
                                : undefined;

                    return (
                        <TouchableOpacity
                            style={[styles.filterChip, selected && styles.filterChipSelected]}
                            onPress={() => onSelectFilter(item.id)}
                            accessibilityRole="tab"
                            accessibilityState={{ selected }}
                        >
                            <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>
                                {item.label}{count !== undefined ? ` ${count}` : ''}
                            </Text>
                        </TouchableOpacity>
                    );
                }}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtersContent}
                style={styles.filtersList}
            />

            <View style={styles.sectionHeading}>
                <Text style={styles.sectionTitle}>{filterTitle(selectedFilter)}</Text>
                <Text style={styles.sectionDescription}>{filterDescription(selectedFilter)}</Text>
            </View>
        </>
    );
}

type MetricCardProps = {
    label: string;
    value: number;
    icon: string;
    selected: boolean;
    onPress: () => void;
};

function MetricCard({ label, value, icon, selected, onPress }: MetricCardProps) {
    return (
        <TouchableOpacity
            style={[styles.metricCard, selected && styles.metricCardSelected]}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${value}`}
        >
            <View style={[styles.metricIcon, selected && styles.metricIconSelected]}>
                <AppIcon name={icon} size={18} color={selected ? palette.primary : palette.muted} />
            </View>
            <Text style={styles.metricValue}>{value}</Text>
            <Text style={styles.metricLabel} numberOfLines={1}>{label}</Text>
        </TouchableOpacity>
    );
}

type EventCardProps = {
    event: HostEvent;
    onOpen: () => void;
    onEdit: () => void;
    onRegistrations: () => void;
    onDelete: () => void;
};

function EventCard({ event, onOpen, onEdit, onRegistrations, onDelete }: EventCardProps) {
    const isPast = isEventRegistrationClosed(event);
    const pending = event.pending_registration_count;
    const capacity = Math.max(Number(event.max_guests) || 0, 0);
    const occupied = Math.min(event.approved_registration_count, capacity || event.approved_registration_count);
    const progress = capacity > 0 ? Math.min(occupied / capacity, 1) : 0;
    const needsLocationReview = !event.city || !event.state;

    return (
        <View style={styles.eventCard}>
            <TouchableOpacity
                style={styles.eventSummary}
                onPress={onOpen}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`Abrir ${event.title}`}
            >
                <Image
                    source={{
                        uri: getOptimizedImageUrl(event.cover_image_url, { width: 320 }) || DEFAULT_PLACEHOLDER_IMAGE,
                    }}
                    style={styles.eventImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                />
                <View style={styles.eventInfo}>
                    <View style={styles.statusLine}>
                        <View style={[styles.statusBadge, isPast ? styles.statusBadgePast : styles.statusBadgeActive]}>
                            <Text style={[styles.statusBadgeText, isPast ? styles.statusBadgeTextPast : styles.statusBadgeTextActive]}>
                                {isPast ? 'ENCERRADO' : 'PUBLICADO'}
                            </Text>
                        </View>
                        {pending > 0 && (
                            <View style={styles.pendingCountBadge}>
                                <Text style={styles.pendingCountBadgeText}>{pending} {pending === 1 ? 'PENDENTE' : 'PENDENTES'}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                    <View style={styles.metadataLine}>
                        <AppIcon name="calendar-outline" size={15} color={palette.muted} />
                        <Text style={styles.metadataText} numberOfLines={1}>{formatEventDate(event)}</Text>
                    </View>
                    <View style={styles.metadataLine}>
                        <AppIcon name="location-outline" size={15} color={palette.muted} />
                        <Text style={styles.metadataText} numberOfLines={1}>{eventLocation(event)}</Text>
                    </View>
                    <Text style={styles.eventPrice}>{formatPrice(Number(event.price) || 0)} <Text style={styles.priceSuffix}>por pessoa</Text></Text>
                </View>
            </TouchableOpacity>

            {!isPast && (
                <View style={styles.capacityBlock}>
                    <View style={styles.capacityHeader}>
                        <Text style={styles.capacityLabel}>Vagas aprovadas</Text>
                        <Text style={styles.capacityValue}>{occupied} de {capacity}</Text>
                    </View>
                    <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: capacity, now: occupied }}>
                        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                    </View>
                </View>
            )}

            {pending > 0 && (
                <TouchableOpacity
                    style={styles.pendingAction}
                    onPress={onRegistrations}
                    accessibilityRole="button"
                    accessibilityLabel={`Revisar ${pending} inscrições pendentes`}
                >
                    <View style={styles.pendingActionIcon}>
                        <AppIcon name="person-add-outline" size={20} color={palette.warning} />
                    </View>
                    <View style={styles.pendingActionCopy}>
                        <Text style={styles.pendingActionTitle}>Há pessoas esperando sua resposta</Text>
                        <Text style={styles.pendingActionDescription}>Toque para analisar as solicitações.</Text>
                    </View>
                    <AppIcon name="chevron-forward" size={20} color={palette.warning} />
                </TouchableOpacity>
            )}

            {needsLocationReview && (
                <TouchableOpacity style={styles.locationWarning} onPress={onEdit} accessibilityRole="button">
                    <AppIcon name="warning-outline" size={19} color="#8A4B08" />
                    <Text style={styles.locationWarningText}>Complete a cidade e o estado antes de divulgar.</Text>
                    <AppIcon name="chevron-forward" size={18} color="#8A4B08" />
                </TouchableOpacity>
            )}

            <View style={styles.eventActions}>
                <TouchableOpacity
                    style={[styles.cardAction, styles.cardActionPrimary]}
                    onPress={onRegistrations}
                    accessibilityRole="button"
                >
                    <AppIcon name="people-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.cardActionPrimaryText}>{pending > 0 ? 'Revisar' : 'Inscrições'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cardAction} onPress={onOpen} accessibilityRole="button">
                    <AppIcon name="eye-outline" size={18} color={palette.text} />
                    <Text style={styles.cardActionText}>Ver</Text>
                </TouchableOpacity>
                {!isPast && (
                    <TouchableOpacity style={styles.cardAction} onPress={onEdit} accessibilityRole="button">
                        <AppIcon name="pencil-outline" size={18} color={palette.text} />
                        <Text style={styles.cardActionText}>Editar</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    style={styles.deleteAction}
                    onPress={onDelete}
                    accessibilityRole="button"
                    accessibilityLabel="Cancelar evento"
                >
                    <AppIcon name="trash-outline" size={19} color={palette.danger} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

type DraftCardProps = {
    draft: EventDraftRecord;
    onContinue: (step: number) => void;
    onDelete: () => void;
};

function DraftCard({ draft, onContinue, onDelete }: DraftCardProps) {
    const payload = draft.payload as any;
    const title = payload.details?.title?.trim() || 'Evento sem título';
    const cover = payload.details?.coverImage
        || payload.details?.coverImageUrl
        || payload.coverImage
        || payload.coverImageUrl;
    const savedStep = Math.min(Math.max(Number(draft.currentStep) || 0, 0), DRAFT_STEP_ROUTES.length - 1);
    const progress = ((savedStep + 1) / DRAFT_STEP_ROUTES.length) * 100;

    return (
        <View style={styles.draftCard}>
            <View style={styles.draftTopLine}>
                <View style={styles.draftBadge}>
                    <AppIcon name="document-text-outline" size={15} color={palette.warning} />
                    <Text style={styles.draftBadgeText}>RASCUNHO</Text>
                </View>
                <Text style={styles.draftSavedAt}>Salvo em {new Date(draft.updatedAt).toLocaleDateString('pt-BR')}</Text>
            </View>
            <View style={styles.draftBody}>
                {cover ? (
                    <Image
                        source={{ uri: getOptimizedImageUrl(cover, { width: 220 }) }}
                        style={styles.draftImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                    />
                ) : (
                    <View style={styles.draftImageFallback}>
                        <AppIcon name="restaurant-outline" size={26} color={palette.subtle} />
                    </View>
                )}
                <View style={styles.draftCopy}>
                    <Text style={styles.draftTitle} numberOfLines={2}>{title}</Text>
                    <Text style={styles.draftProgressLabel}>Etapa {savedStep + 1} de {DRAFT_STEP_ROUTES.length}</Text>
                    <View style={styles.draftProgressTrack}>
                        <View style={[styles.draftProgressFill, { width: `${progress}%` }]} />
                    </View>
                </View>
            </View>
            <View style={styles.draftActions}>
                <TouchableOpacity
                    style={styles.continueButton}
                    onPress={() => onContinue(savedStep)}
                    accessibilityRole="button"
                >
                    <Text style={styles.continueButtonText}>Continuar criação</Text>
                    <AppIcon name="arrow-forward" size={18} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.deleteDraftButton}
                    onPress={onDelete}
                    accessibilityRole="button"
                    accessibilityLabel="Excluir rascunho"
                >
                    <AppIcon name="trash-outline" size={19} color={palette.danger} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

function LoadingState() {
    return (
        <View style={styles.loadingState}>
            <ActivityIndicator color={palette.primary} size="large" />
            <Text style={styles.loadingTitle}>Organizando seus eventos</Text>
            <Text style={styles.loadingDescription}>Carregando inscrições, rascunhos e próximos passos.</Text>
        </View>
    );
}

type EmptyStateProps = {
    filter: DashboardFilter;
    hasSearch: boolean;
    onCreate: () => void;
    onClearSearch: () => void;
};

function EmptyState({ filter, hasSearch, onCreate, onClearSearch }: EmptyStateProps) {
    const copy = hasSearch
        ? { title: 'Nenhum resultado', description: 'Tente buscar por outro nome ou cidade.' }
        : filter === 'attention'
            ? { title: 'Nenhuma pendência', description: 'Todas as solicitações já receberam atenção.' }
            : filter === 'drafts'
                ? { title: 'Nenhum rascunho', description: 'Seus eventos em criação aparecerão aqui.' }
                : filter === 'past'
                    ? { title: 'Nenhum evento encerrado', description: 'Seu histórico aparecerá aqui depois do primeiro evento.' }
                    : { title: 'Seu próximo encontro começa aqui', description: 'Crie uma experiência, publique e acompanhe tudo por esta central.' };

    return (
        <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
                <AppIcon name={filter === 'attention' ? 'checkmark-circle' : 'calendar-outline'} size={34} color={palette.primary} />
            </View>
            <Text style={styles.emptyTitle}>{copy.title}</Text>
            <Text style={styles.emptyDescription}>{copy.description}</Text>
            <TouchableOpacity
                style={styles.emptyButton}
                onPress={hasSearch ? onClearSearch : onCreate}
                accessibilityRole="button"
            >
                <Text style={styles.emptyButtonText}>{hasSearch ? 'Limpar busca' : 'Criar um evento'}</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: palette.surface },
    topBar: {
        minHeight: 76,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: palette.border,
        backgroundColor: palette.surface,
    },
    titleGroup: { flex: 1, paddingRight: Spacing.md },
    eyebrow: { fontSize: 10, lineHeight: 14, letterSpacing: 1.2, fontWeight: '800', color: palette.primary },
    screenTitle: { marginTop: 1, fontSize: 28, lineHeight: 34, fontWeight: '800', color: palette.text },
    topActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    iconButton: {
        width: Dimensions.touchTarget.recommended,
        height: Dimensions.touchTarget.recommended,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F3F4F6',
    },
    createButton: {
        minHeight: Dimensions.touchTarget.recommended,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.full,
        backgroundColor: palette.primary,
    },
    createButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
    listContent: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.xxxl },
    attentionCard: {
        minHeight: 108,
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.lg,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: '#F4C9AC',
        backgroundColor: palette.warningSoft,
    },
    attentionIcon: {
        width: 50,
        height: 50,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFE1CC',
    },
    attentionCopy: { flex: 1, paddingHorizontal: Spacing.md },
    attentionKicker: { fontSize: 10, lineHeight: 14, letterSpacing: 0.9, fontWeight: '800', color: palette.warning },
    attentionTitle: { marginTop: 2, fontSize: 16, lineHeight: 21, fontWeight: '800', color: palette.text },
    attentionDescription: { marginTop: 3, fontSize: 12, lineHeight: 17, color: palette.muted },
    attentionArrow: { width: 32, height: 44, alignItems: 'flex-end', justifyContent: 'center' },
    allGoodCard: {
        minHeight: 82,
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.lg,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: '#CDE8D8',
        backgroundColor: palette.successSoft,
    },
    allGoodIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D8F0E2' },
    allGoodTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: '#185C39' },
    allGoodDescription: { marginTop: 2, fontSize: 12, lineHeight: 17, color: '#397257' },
    metricsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
    metricCard: {
        flex: 1,
        minWidth: 0,
        minHeight: 104,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.surface,
    },
    metricCardSelected: { borderColor: '#F1B28D', backgroundColor: palette.primarySoft },
    metricIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
    metricIconSelected: { backgroundColor: '#FFDDC8' },
    metricValue: { marginTop: Spacing.sm, fontSize: 21, lineHeight: 24, fontWeight: '800', color: palette.text },
    metricLabel: { marginTop: 1, fontSize: 11, lineHeight: 15, fontWeight: '600', color: palette.muted },
    errorCard: {
        minHeight: 72,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        marginTop: Spacing.md,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        backgroundColor: '#FFF0EE',
        borderWidth: 1,
        borderColor: '#F7C5BF',
    },
    errorCopy: { flex: 1 },
    errorTitle: { fontSize: 13, fontWeight: '800', color: palette.danger },
    errorDescription: { marginTop: 2, fontSize: 11, lineHeight: 15, color: '#8A342B' },
    retryButton: { minWidth: 58, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    retryButtonText: { fontSize: 13, fontWeight: '800', color: palette.danger },
    searchBox: {
        minHeight: 52,
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Spacing.xl,
        paddingLeft: Spacing.lg,
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: BorderRadius.lg,
        backgroundColor: palette.surface,
    },
    searchInput: { flex: 1, minHeight: 50, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: 15, color: palette.text },
    clearSearchButton: { width: 44, height: 50, alignItems: 'center', justifyContent: 'center' },
    filtersList: { marginHorizontal: -Spacing.lg, marginTop: Spacing.md },
    filtersContent: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
    filterChip: {
        minHeight: 44,
        justifyContent: 'center',
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.surface,
    },
    filterChipSelected: { borderColor: palette.text, backgroundColor: palette.text },
    filterChipText: { fontSize: 13, fontWeight: '700', color: palette.muted },
    filterChipTextSelected: { color: '#FFFFFF' },
    sectionHeading: { marginTop: Spacing.xl, marginBottom: Spacing.md },
    sectionTitle: { fontSize: 20, lineHeight: 25, fontWeight: '800', color: palette.text },
    sectionDescription: { marginTop: 3, fontSize: 13, lineHeight: 18, color: palette.muted },
    eventCard: {
        marginBottom: Spacing.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: BorderRadius.xl,
        backgroundColor: palette.surface,
        shadowColor: '#101828',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
    },
    eventSummary: { minHeight: 142, flexDirection: 'row', padding: Spacing.md },
    eventImage: { width: 112, minHeight: 118, borderRadius: BorderRadius.lg, backgroundColor: '#ECEEF1' },
    eventInfo: { flex: 1, minWidth: 0, paddingLeft: Spacing.md },
    statusLine: { minHeight: 24, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5 },
    statusBadge: { minHeight: 22, justifyContent: 'center', paddingHorizontal: 7, borderRadius: BorderRadius.full },
    statusBadgeActive: { backgroundColor: palette.successSoft },
    statusBadgePast: { backgroundColor: '#EFF1F3' },
    statusBadgeText: { fontSize: 9, letterSpacing: 0.5, fontWeight: '800' },
    statusBadgeTextActive: { color: palette.success },
    statusBadgeTextPast: { color: palette.muted },
    pendingCountBadge: { minHeight: 22, justifyContent: 'center', paddingHorizontal: 7, borderRadius: BorderRadius.full, backgroundColor: '#FFE6D5' },
    pendingCountBadgeText: { fontSize: 8, letterSpacing: 0.3, fontWeight: '800', color: palette.warning },
    eventTitle: { marginTop: 5, fontSize: 17, lineHeight: 21, fontWeight: '800', color: palette.text },
    metadataLine: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
    metadataText: { flex: 1, fontSize: 11, lineHeight: 15, color: palette.muted },
    eventPrice: { marginTop: 7, fontSize: 13, lineHeight: 17, fontWeight: '800', color: palette.primary },
    priceSuffix: { fontSize: 10, fontWeight: '500', color: palette.muted },
    capacityBlock: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
    capacityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
    capacityLabel: { fontSize: 11, fontWeight: '700', color: palette.muted },
    capacityValue: { fontSize: 11, fontWeight: '800', color: palette.text },
    progressTrack: { height: 6, overflow: 'hidden', borderRadius: 3, backgroundColor: '#ECEEF1' },
    progressFill: { height: '100%', borderRadius: 3, backgroundColor: palette.primary },
    pendingAction: {
        minHeight: 72,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: '#F6D1B7',
        backgroundColor: palette.warningSoft,
    },
    pendingActionIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFE1CC' },
    pendingActionCopy: { flex: 1, paddingHorizontal: Spacing.md },
    pendingActionTitle: { fontSize: 13, lineHeight: 17, fontWeight: '800', color: palette.text },
    pendingActionDescription: { marginTop: 2, fontSize: 11, lineHeight: 15, color: palette.muted },
    locationWarning: {
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: '#F6D58A',
        backgroundColor: '#FFF8E8',
    },
    locationWarningText: { flex: 1, fontSize: 12, lineHeight: 16, fontWeight: '700', color: '#7A4308' },
    eventActions: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 6, padding: Spacing.md, borderTopWidth: 1, borderTopColor: palette.border },
    cardAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 10, borderRadius: BorderRadius.md, backgroundColor: '#F3F4F6' },
    cardActionPrimary: { flex: 1, backgroundColor: palette.primary },
    cardActionText: { fontSize: 12, fontWeight: '800', color: palette.text },
    cardActionPrimaryText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
    deleteAction: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md, backgroundColor: '#FFF0EE' },
    draftCard: {
        marginBottom: Spacing.lg,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: '#F0D5C1',
        borderRadius: BorderRadius.xl,
        backgroundColor: '#FFFAF6',
    },
    draftTopLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
    draftBadge: { minHeight: 26, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, borderRadius: BorderRadius.full, backgroundColor: '#FFE7D5' },
    draftBadgeText: { fontSize: 9, letterSpacing: 0.5, fontWeight: '800', color: palette.warning },
    draftSavedAt: { flexShrink: 1, fontSize: 10, color: palette.muted },
    draftBody: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md },
    draftImage: { width: 82, height: 82, borderRadius: BorderRadius.lg, backgroundColor: '#ECEEF1' },
    draftImageFallback: { width: 82, height: 82, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.lg, backgroundColor: '#F0ECE8' },
    draftCopy: { flex: 1, minWidth: 0, paddingLeft: Spacing.md },
    draftTitle: { fontSize: 17, lineHeight: 22, fontWeight: '800', color: palette.text },
    draftProgressLabel: { marginTop: 8, fontSize: 11, fontWeight: '700', color: palette.muted },
    draftProgressTrack: { height: 5, overflow: 'hidden', marginTop: 6, borderRadius: 3, backgroundColor: '#E9E2DC' },
    draftProgressFill: { height: '100%', borderRadius: 3, backgroundColor: palette.primary },
    draftActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.lg },
    continueButton: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: BorderRadius.md, backgroundColor: palette.primary },
    continueButtonText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
    deleteDraftButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md, backgroundColor: '#FFF0EE' },
    loadingState: { minHeight: 260, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxl },
    loadingTitle: { marginTop: Spacing.lg, fontSize: 16, fontWeight: '800', color: palette.text },
    loadingDescription: { marginTop: Spacing.xs, textAlign: 'center', fontSize: 13, lineHeight: 18, color: palette.muted },
    emptyState: { minHeight: 280, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.xxl },
    emptyIcon: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', borderRadius: 36, backgroundColor: palette.primarySoft },
    emptyTitle: { marginTop: Spacing.lg, textAlign: 'center', fontSize: 18, lineHeight: 23, fontWeight: '800', color: palette.text },
    emptyDescription: { marginTop: Spacing.sm, maxWidth: 290, textAlign: 'center', fontSize: 13, lineHeight: 19, color: palette.muted },
    emptyButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.xl, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.full, backgroundColor: palette.primary },
    emptyButtonText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
});
