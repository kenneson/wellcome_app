import { eventService } from '@/services/api/EventService';
import { EventDraftRecord, eventDraftService } from '@/services/api/EventDraftService';
import { DEFAULT_PLACEHOLDER_IMAGE } from '@/shared/lib/styles';
import { supabase } from '@/shared/lib/supabase';
import { getEventStart, isEventRegistrationClosed } from '@/shared/lib/eventAvailability';
import { formatPrice } from '@/utils/formatters';
import { getOptimizedImageUrl } from '@/utils/imageOptimizer';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BrandSheet, BrandStackHeader, HeaderIconButton } from '@/components/ui/wellcome';
import { BorderRadius, Palette, Spacing } from '@/shared/constants/theme';

type EventFilter = 'todos' | 'pendentes' | 'ativos' | 'concluidos' | 'rascunhos';

const FILTER_LABELS: Record<EventFilter, string> = {
    todos: 'Todos',
    pendentes: 'Pendentes',
    ativos: 'Ativos',
    concluidos: 'Concluídos',
    rascunhos: 'Rascunhos',
};

const DRAFT_STEP_ROUTES = [
    '/events/create',
    '/events/create/menu',
    '/events/create/location',
    '/events/create/details',
    '/events/create/settings',
] as const;

export default function MyEventsScreen() {
    const router = useRouter();
    const [events, setEvents] = useState<any[]>([]);
    const [drafts, setDrafts] = useState<EventDraftRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<EventFilter>('todos');

    const fetchMyEvents = React.useCallback(async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const draftRequest = eventDraftService.list();

            // Fetch events with participant count
            const { data, error } = await supabase
                .from('events')
                .select(`
                    *,
                    event_participants(status)
                `)
                .eq('host_id', session.user.id)
                .is('cancelled_at', null)
                .order('event_date', { ascending: false });

            if (error) throw error;
            
            // Map the data to include registration summaries directly.
            const formattedEvents = data?.map(event => {
                const registrations = event.event_participants || [];
                return {
                    ...event,
                    participants_count: registrations.filter(
                    (p: any) => !['REJECTED', 'CANCELLED', 'EXPIRED'].includes(p.status)
                    ).length,
                    pending_registrations_count: registrations.filter(
                        (p: any) => p.status === 'PENDING'
                    ).length,
                    approved_registrations_count: registrations.filter(
                        (p: any) => p.status === 'APPROVED'
                    ).length,
                };
            }) || [];

            setEvents(formattedEvents);
            setDrafts(await draftRequest);
        } catch (error: any) {
            Alert.alert('Erro', error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(React.useCallback(() => {
        void fetchMyEvents();
    }, [fetchMyEvents]));

    async function handleDelete(id: string) {
        Alert.alert(
            'Confirmar exclusão',
            'Tem certeza que deseja cancelar este evento? Quem pagou recebe a devolução integral, e a taxa do meio de pagamento de cada Pix/boleto reembolsado é debitada do seu saldo.',
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

    function handleDeleteDraft(item: EventDraftRecord) {
        Alert.alert('Excluir rascunho?', 'Esta ação não pode ser desfeita.', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Excluir',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await eventDraftService.delete(item.id);
                        const cover = (item.payload as any).details?.coverImage;
                        if (cover) await eventService.deleteUploadedImage(cover);
                        await eventDraftService.removeLocal(item.id);
                        setDrafts((current) => current.filter((draft) => draft.id !== item.id));
                    } catch (error: any) {
                        Alert.alert('Não foi possível excluir', error.message || 'Tente novamente.');
                    }
                },
            },
        ]);
    }

    const filteredEvents = useMemo(() => {
        const now = new Date();
        return events.filter(event => {
            const isPast = isEventRegistrationClosed(event, now);

            if (activeFilter === 'rascunhos') return false;
            if (activeFilter === 'pendentes') return (event.pending_registrations_count || 0) > 0;
            if (activeFilter === 'ativos') return !isPast;
            if (activeFilter === 'concluidos') return isPast;
            return true;
        });
    }, [events, activeFilter]);

    const renderDraft = ({ item }: { item: EventDraftRecord }) => {
        const payload = item.payload as any;
        const title = payload.details?.title?.trim() || 'Evento em criação';
        const cover = payload.details?.coverImage
            || payload.details?.coverImageUrl
            || payload.coverImage
            || payload.coverImageUrl;
        const savedStep = Math.min(Math.max(Number(item.currentStep) || 0, 0), DRAFT_STEP_ROUTES.length - 1);
        return (
            <View style={styles.card}>
                <DraftCover uri={getOptimizedImageUrl(cover, { width: 500 })} />
                <View style={styles.cardContent}>
                    <View style={[styles.statusPill, styles.draftPill]}>
                        <Text style={[styles.statusText, styles.draftPillText]}>RASCUNHO</Text>
                    </View>
                    <Text style={styles.cardTitle}>{title}</Text>
                    <Text style={styles.cardMeta}>Etapa {savedStep + 1} de 5 · salvo {new Date(item.updatedAt).toLocaleDateString('pt-BR')}</Text>
                </View>
                <View style={styles.cardActions}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => router.push({ pathname: DRAFT_STEP_ROUTES[savedStep], params: { draftId: item.id } } as any)}
                        accessibilityRole="button"
                    >
                        <Text style={styles.actionButtonText}>Continuar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.iconAction, styles.dangerAction]}
                        onPress={() => handleDeleteDraft(item)}
                        accessibilityRole="button"
                        accessibilityLabel="Excluir rascunho"
                    >
                        <Ionicons name="trash-outline" size={18} color={Palette.danger} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderRegistrationsShortcut = (item: any) => {
        const pendingCount = Number(item.pending_registrations_count || 0);
        const approvedCount = Number(item.approved_registrations_count || 0);
        const targetTab = pendingCount > 0 ? 'pending' : 'confirmed';
        const title = pendingCount > 0
            ? pendingCount + ' ' + (pendingCount === 1 ? 'inscrição pendente' : 'inscrições pendentes')
            : 'Gerenciar inscrições';
        const subtitle = approvedCount + ' ' + (approvedCount === 1 ? 'aprovada' : 'aprovadas');

        return (
            <TouchableOpacity
                style={[
                    styles.registrationsShortcut,
                    pendingCount > 0 && styles.registrationsShortcutPending,
                ]}
                onPress={() => router.push(('/events/' + item.id + '/registrations?tab=' + targetTab) as any)}
                accessibilityRole="button"
                accessibilityLabel={title + '. ' + subtitle + '.'}
                accessibilityHint="Abre a lista de participantes deste evento"
            >
                <View style={[
                    styles.registrationsShortcutIcon,
                    pendingCount > 0 && styles.registrationsShortcutIconPending,
                ]}>
                    <Ionicons
                        name={pendingCount > 0 ? 'person-add-outline' : 'people-outline'}
                        size={22}
                        color={pendingCount > 0 ? Palette.orangeDeep : Palette.inkSoft}
                    />
                </View>
                <View style={styles.registrationsShortcutContent}>
                    <Text style={[
                        styles.registrationsShortcutTitle,
                        pendingCount > 0 && styles.registrationsShortcutTitlePending,
                    ]}>
                        {title}
                    </Text>
                    <Text style={styles.registrationsShortcutSubtitle}>{subtitle}</Text>
                </View>
                {pendingCount > 0 && (
                    <View style={styles.pendingBadge}>
                        <Text style={styles.pendingBadgeText}>REVISAR</Text>
                    </View>
                )}
                <Ionicons name="chevron-forward" size={20} color={pendingCount > 0 ? Palette.orangeDeep : Palette.muted} />
            </TouchableOpacity>
        );
    };

    const renderItem = ({ item }: { item: any }) => {
        const eventDate = getEventStart(item) ?? new Date(0);
        const now = new Date();
        const isPast = isEventRegistrationClosed(item, now);
        const eventAlreadyStarted = eventDate <= now;
        const needsLocationReview = !item.city || !item.state;
        const progress = Math.min((item.participants_count || 0) / (item.max_guests || 1), 1);

        if (isPast) {
            // Concluded Event Card Style
            return (
                <View style={styles.card}>
                    <View style={styles.imageContainer}>
                        <Image
                            source={{ uri: getOptimizedImageUrl(item.cover_image_url, { width: 400 }) || DEFAULT_PLACEHOLDER_IMAGE }}
                            style={[styles.cardImage, styles.cardImageMuted]}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                        />
                        <View style={styles.badgeContainer}>
                            <View style={[styles.statusPill, styles.concludedBadge]}>
                                <Text style={[styles.statusText, styles.concludedBadgeText]}>
                                    {eventAlreadyStarted ? 'CONCLUÍDO' : 'INSCRIÇÕES ENCERRADAS'}
                                </Text>
                            </View>
                        </View>
                        <LinearGradient
                            colors={['transparent', Palette.scrim]}
                            style={styles.imageOverlay}
                        >
                            <Text style={styles.cardTitleOverlay}>{item.title}</Text>
                        </LinearGradient>
                    </View>

                    <View style={styles.cardContent}>
                        <View style={styles.row}>
                            <Ionicons name="calendar-outline" size={16} color={Palette.muted} />
                            <Text style={styles.dateText}>
                                {eventDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                            </Text>
                            <Text style={styles.priceText}>
                                {formatPrice(item.price)}
                                <Text style={styles.perGuestText}> por convidado</Text>
                            </Text>
                        </View>
                    </View>

                    {renderRegistrationsShortcut(item)}

                    {needsLocationReview && (
                        <TouchableOpacity style={styles.locationReview} onPress={() => router.push(`/events/${item.id}/edit`)} accessibilityRole="button">
                            <Ionicons name="warning-outline" size={18} color={Palette.orangeDarker} />
                            <Text style={styles.locationReviewText}>Confirme a cidade e o estado deste evento</Text>
                            <Ionicons name="chevron-forward" size={18} color={Palette.orangeDarker} />
                        </TouchableOpacity>
                    )}

                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.secondaryAction} onPress={() => router.push(`/events/${item.id}`)} accessibilityRole="button">
                            <Ionicons name="eye-outline" size={18} color={Palette.ink} />
                            <Text style={styles.secondaryActionText}>Ver detalhes</Text>
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
                        <View style={[styles.statusPill, styles.activeBadge]}>
                            <Text style={[styles.statusText, styles.activeBadgeText]}>ATIVO</Text>
                        </View>
                    </View>
                    <LinearGradient
                        colors={['transparent', Palette.scrim]}
                        style={styles.imageOverlay}
                    >
                        <Text style={styles.cardTitleOverlay}>{item.title}</Text>
                    </LinearGradient>
                </View>

                <View style={styles.cardContent}>
                    <View style={styles.infoRow}>
                        <View style={styles.dateInfo}>
                            <Ionicons name="calendar-outline" size={16} color={Palette.muted} />
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
                                <Text style={styles.progressCount}>{item.participants_count}</Text>
                                /{item.max_guests} vagas
                            </Text>
                        </View>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
                        </View>
                    </View>
                </View>

                {renderRegistrationsShortcut(item)}

                {needsLocationReview && (
                    <TouchableOpacity style={styles.locationReview} onPress={() => router.push(`/events/${item.id}/edit`)} accessibilityRole="button">
                        <Ionicons name="warning-outline" size={18} color={Palette.orangeDarker} />
                        <Text style={styles.locationReviewText}>Confirme a cidade e o estado deste evento</Text>
                        <Ionicons name="chevron-forward" size={18} color={Palette.orangeDarker} />
                    </TouchableOpacity>
                )}

                <View style={styles.cardActions}>
                    <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => router.push(`/events/${item.id}`)}
                        accessibilityRole="button"
                    >
                        <Text style={styles.actionButtonText}>Ver detalhes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.actionButton, styles.secondaryButton]}
                        onPress={() => router.push(`/events/${item.id}/edit`)}
                        accessibilityRole="button"
                    >
                        <Ionicons name="pencil" size={18} color={Palette.ink} />
                        <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.actionButton, styles.iconAction, styles.dangerAction]}
                        onPress={() => handleDelete(item.id)}
                        accessibilityRole="button"
                        accessibilityLabel="Excluir evento"
                    >
                        <Ionicons name="trash-outline" size={18} color={Palette.danger} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="light-content" backgroundColor={Palette.orange} />

            <BrandStackHeader
                eyebrow="ANFITRIÃO"
                title="Meus eventos"
                onBack={() => router.back()}
                actions={(
                    <HeaderIconButton
                        icon="add"
                        accessibilityLabel="Criar novo evento"
                        onPress={() => router.push('/events/create')}
                    />
                )}
            />

            <BrandSheet>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.filterTabsScroll}
                    contentContainerStyle={styles.filterTabs}
                    accessibilityRole="tablist"
                >
                    {(['todos', 'pendentes', 'ativos', 'concluidos', 'rascunhos'] as EventFilter[]).map((filter) => (
                        <TouchableOpacity
                            key={filter}
                            style={[styles.filterTab, activeFilter === filter && styles.activeFilterTab]}
                            onPress={() => setActiveFilter(filter)}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: activeFilter === filter }}
                        >
                            <Text style={[
                                styles.filterText,
                                activeFilter === filter && styles.activeFilterText
                            ]} numberOfLines={1}>
                                {FILTER_LABELS[filter]}
                                {filter === 'pendentes' && ' (' + events.reduce((total, event) => total + Number(event.pending_registrations_count || 0), 0) + ')'}
                                {filter === 'ativos' && ` (${events.filter(e => !isEventRegistrationClosed(e)).length})`}
                                {filter === 'rascunhos' && ` (${drafts.length})`}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {loading ? (
                    <ActivityIndicator size="large" color={Palette.orange} style={styles.loading} />
                ) : (
                    <FlatList
                        data={activeFilter === 'rascunhos' ? drafts : filteredEvents}
                        keyExtractor={item => item.id}
                        renderItem={activeFilter === 'rascunhos' ? renderDraft as any : renderItem}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <View style={styles.emptyIconContainer}>
                                    <Ionicons name="calendar-outline" size={32} color={Palette.orangeDeep} />
                                </View>
                                <Text style={styles.emptyText}>Nenhum evento encontrado.</Text>
                                <Text style={styles.emptySubText}>
                                    Que tal criar seu primeiro evento e começar a receber convidados?
                                </Text>
                                <TouchableOpacity style={styles.createButtonLarge} onPress={() => router.push('/events/create')} accessibilityRole="button">
                                    <Text style={styles.createButtonTextLarge}>Criar meu primeiro evento</Text>
                                </TouchableOpacity>
                            </View>
                        }
                    />
                )}
            </BrandSheet>
        </View>
    );
}

function DraftCover({ uri }: { uri?: string }) {
    const [hasError, setHasError] = useState(false);

    return (
        <View style={styles.draftImageContainer}>
            {uri && !hasError ? (
                <Image
                    source={{ uri }}
                    style={styles.cardImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    onError={() => setHasError(true)}
                />
            ) : (
                <View style={styles.draftImageFallback}>
                    <Ionicons name="restaurant-outline" size={32} color={Palette.orangeDeep} />
                    <Text style={styles.draftImageFallbackText}>Capa pendente</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Palette.paper,
    },
    loading: {
        marginTop: 40,
    },
    filterTabs: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.xl,
        gap: Spacing.sm,
    },
    filterTabsScroll: {
        flexGrow: 0,
        marginTop: Spacing.lg,
        marginBottom: Spacing.sm,
    },
    filterTab: {
        minHeight: 44,
        paddingHorizontal: Spacing.lg,
        minWidth: 76,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: BorderRadius.full,
        backgroundColor: Palette.surface,
        borderWidth: 1,
        borderColor: Palette.line,
    },
    activeFilterTab: {
        backgroundColor: Palette.ink,
        borderColor: Palette.ink,
    },
    filterText: {
        fontSize: 14,
        color: Palette.inkSoft,
        fontWeight: '700',
    },
    activeFilterText: {
        color: '#FFFFFF',
        fontWeight: '800',
    },
    listContent: {
        padding: Spacing.xl,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.xxxl * 2,
        gap: Spacing.md,
    },
    card: {
        backgroundColor: Palette.surface,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        overflow: 'hidden',
    },
    imageContainer: {
        height: 160,
        position: 'relative',
        backgroundColor: Palette.track,
    },
    cardImage: {
        width: '100%',
        height: '100%',
    },
    cardImageMuted: {
        opacity: 0.6,
    },
    draftImageContainer: {
        width: '100%',
        aspectRatio: 16 / 9,
        backgroundColor: Palette.orangeSoft,
    },
    draftImageFallback: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    draftImageFallbackText: {
        color: Palette.orangeDeep,
        fontSize: 12,
        fontWeight: '800',
    },
    imageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60%',
        justifyContent: 'flex-end',
        padding: 14,
    },
    badgeContainer: {
        position: 'absolute',
        top: Spacing.md,
        right: Spacing.md,
    },
    statusPill: {
        alignSelf: 'flex-start',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: BorderRadius.full,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.4,
    },
    activeBadge: {
        backgroundColor: Palette.greenSoft,
    },
    concludedBadge: {
        backgroundColor: Palette.track,
    },
    activeBadgeText: {
        color: Palette.green,
    },
    concludedBadgeText: {
        color: Palette.inkSoft,
    },
    draftPill: {
        backgroundColor: Palette.orangeSoft,
        marginBottom: Spacing.xs,
    },
    draftPillText: {
        color: Palette.orangeDarker,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: Palette.ink,
    },
    cardMeta: {
        fontSize: 13,
        color: Palette.inkSoft,
        marginTop: 4,
    },
    cardTitleOverlay: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 2,
    },
    cardContent: {
        padding: 14,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.lg,
    },
    dateInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateText: {
        fontSize: 14,
        color: Palette.inkSoft,
        marginLeft: 6,
    },
    priceHighlight: {
        fontSize: 18,
        fontWeight: '800',
        color: Palette.ink,
        textAlign: 'right',
    },
    perGuestText: {
        fontSize: 11,
        color: Palette.muted,
        textAlign: 'right',
    },
    progressContainer: {
        marginBottom: Spacing.xs,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
    },
    progressLabel: {
        fontSize: 11,
        color: Palette.inkSoft,
        fontWeight: '800',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
    },
    progressValue: {
        fontSize: 13,
        color: Palette.inkSoft,
    },
    progressCount: {
        color: Palette.orangeDeep,
        fontWeight: '800',
    },
    progressBarBg: {
        height: 6,
        backgroundColor: Palette.track,
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: Palette.orange,
        borderRadius: BorderRadius.full,
    },
    locationReview: {
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: Palette.orangeSoft,
        borderTopWidth: 1,
        borderTopColor: Palette.lineSoft,
    },
    locationReviewText: {
        flex: 1,
        color: Palette.orangeDarker,
        fontSize: 13,
        fontWeight: '800',
    },
    registrationsShortcut: {
        minHeight: 64,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: Palette.paper,
        borderTopWidth: 1,
        borderTopColor: Palette.lineSoft,
    },
    registrationsShortcutPending: {
        backgroundColor: Palette.orangeSoft,
    },
    registrationsShortcutIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Palette.track,
    },
    registrationsShortcutIconPending: {
        backgroundColor: Palette.surface,
    },
    registrationsShortcutContent: {
        flex: 1,
    },
    registrationsShortcutTitle: {
        color: Palette.ink,
        fontSize: 14,
        fontWeight: '800',
    },
    registrationsShortcutTitlePending: {
        color: Palette.orangeDarker,
    },
    registrationsShortcutSubtitle: {
        color: Palette.inkSoft,
        fontSize: 12,
        marginTop: 2,
    },
    pendingBadge: {
        minHeight: 24,
        justifyContent: 'center',
        paddingHorizontal: Spacing.sm,
        borderRadius: BorderRadius.full,
        backgroundColor: Palette.orangeDeep,
    },
    pendingBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.4,
    },
    cardActions: {
        flexDirection: 'row',
        padding: 14,
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Palette.lineSoft,
        justifyContent: 'space-between',
        gap: Spacing.sm,
    },
    actionButton: {
        flex: 2,
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: Spacing.md,
        backgroundColor: Palette.orange,
        borderWidth: 1,
        borderColor: Palette.orange,
        borderRadius: BorderRadius.full,
    },
    secondaryButton: {
        flex: 1,
        backgroundColor: Palette.surface,
        borderColor: Palette.line,
    },
    iconAction: {
        flex: 0,
        width: 44,
        paddingHorizontal: 0,
    },
    dangerAction: {
        backgroundColor: Palette.surface,
        borderColor: Palette.dangerLine,
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    secondaryButtonText: {
        color: Palette.ink,
    },
    // Concluded styles additions
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    priceText: {
        fontSize: 14,
        fontWeight: '800',
        color: Palette.ink,
        marginLeft: 'auto',
    },
    actionRow: {
        flexDirection: 'row',
        padding: 14,
        borderTopWidth: 1,
        borderTopColor: Palette.lineSoft,
    },
    secondaryAction: {
        flex: 1,
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: Palette.surface,
        borderWidth: 1,
        borderColor: Palette.line,
        paddingHorizontal: Spacing.xl,
        borderRadius: BorderRadius.full,
    },
    secondaryActionText: {
        color: Palette.ink,
        fontWeight: '800',
        fontSize: 14,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: Spacing.xxxl,
        paddingHorizontal: Spacing.lg,
        gap: Spacing.md,
    },
    emptyIconContainer: {
        width: 72,
        height: 72,
        backgroundColor: Palette.orangeSoft,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.xs,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '800',
        color: Palette.ink,
        textAlign: 'center',
    },
    emptySubText: {
        fontSize: 14,
        color: Palette.inkSoft,
        textAlign: 'center',
        lineHeight: 21,
        maxWidth: 300,
    },
    createButtonLarge: {
        minHeight: 48,
        justifyContent: 'center',
        backgroundColor: Palette.orange,
        paddingHorizontal: Spacing.xxl,
        marginTop: Spacing.sm,
        borderRadius: BorderRadius.full,
    },
    createButtonTextLarge: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
    },
});
