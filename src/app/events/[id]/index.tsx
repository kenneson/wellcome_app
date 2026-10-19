import { ReportSheet } from '@/components/ui/ReportSheet';
import { Event } from '@/entities/event/types';
import { ReviewForm } from '@/features/reviews/ReviewForm';
import { ReviewList } from '@/features/reviews/ReviewList';
import { eventService } from '@/services/api/EventService';
import { registrationFlow, canPayRegistration } from '@/shared/lib/registrationFlow';
import { registrationService } from '@/services/api/RegistrationService';
import { chatService } from '@/services/api/ChatService';
import { reviewService } from '@/services/api/ReviewService';
import { DEFAULT_AVATAR_PLACEHOLDER, DEFAULT_PLACEHOLDER_IMAGE } from '@/shared/lib/styles';
import { supabase } from '@/shared/lib/supabase';
import { isEventRegistrationClosed } from '@/shared/lib/eventAvailability';
import { formatPrice } from '@/utils/formatters';
import { getOptimizedImageUrl } from '@/utils/imageOptimizer';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import { BorderRadius, Elevation, Palette, Spacing } from '@/shared/constants/theme';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { friendlyErrorMessage } from '@/shared/lib/errorMessages';

// Map facilities/rules to icons/labels
const FACILITY_ICONS: Record<string, { icon: string, label: string }> = {
    'parking': { icon: 'car-outline', label: 'Estacionamento para visitantes' },
    'elevator': { icon: 'business-outline', label: 'Edifício com elevador' },
    'ac': { icon: 'snow-outline', label: 'Ar condicionado' },
    'wifi': { icon: 'wifi-outline', label: 'Wi-Fi disponível' },
    'accessibility': { icon: 'body-outline', label: 'Acessibilidade' },
    'public_transport': { icon: 'bus-outline', label: 'Próximo a transporte público' },
    'pet_friendly': { icon: 'paw-outline', label: 'Aceita animais' },
    'smoking_allowed': { icon: 'color-filter-outline', label: 'Permitido fumar' },
};

const RULE_ICONS: Record<string, { icon: string, label: string, positive: boolean }> = {
    'no_smoking': { icon: 'close-circle-outline', label: 'Não é permitido fumar', positive: false },
    'no_pets': { icon: 'close-circle-outline', label: 'Não aceito animais', positive: false },
    'no_shoes': { icon: 'footsteps-outline', label: 'Retirar sapatos ao entrar', positive: true },
};

export default function EventDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [isParticipant, setIsParticipant] = useState(false);
    const [isHost, setIsHost] = useState(false);
    const [participantCount, setParticipantCount] = useState(0);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [submittingReview, setSubmittingReview] = useState(false);
    const [myBookingStatus, setMyBookingStatus] = useState<string | null>(null);
    const [myBookingId, setMyBookingId] = useState<string | null>(null);
    const [myPaymentStatus, setMyPaymentStatus] = useState<string | null>(null);
    const [myPaymentDueAt, setMyPaymentDueAt] = useState<string | null>(null);
    const [reportVisible, setReportVisible] = useState(false);

    const isPastEvent = React.useMemo(() => {
        if (!event) return false;
        const eventTime = new Date(event.endTime || event.eventDate).getTime();
        // eslint-disable-next-line react-hooks/purity -- compared against the current time on purpose
        return eventTime < Date.now();
    }, [event]);

    const registrationClosed = React.useMemo(
        () => event ? isEventRegistrationClosed(event) : false,
        [event]
    );

    const userHasReviewed = React.useMemo(() => {
        if (!event?.reviews || !currentUserId) return false;
        return event.reviews.some(r => r.userId === currentUserId);
    }, [event, currentUserId]);

    const fetchEventDetails = React.useCallback(async (quiet = false) => {
        try {
            if (!quiet) setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id;
            setCurrentUserId(userId || null);

            const eventData = await eventService.getEventById(id as string);
            setEvent(eventData);
            setParticipantCount(eventData.participantCount ?? 0);

            if (userId && eventData.hostId === userId) {
                setIsHost(true);
            }

            if (userId && eventData.bookings) {
                const myParticipation = eventData.bookings.find(b => b.userId === userId);
                setIsParticipant(!!myParticipation);
                setMyBookingStatus(myParticipation?.status || null);
                setMyBookingId(myParticipation?.id || null);
                setMyPaymentStatus(myParticipation?.paymentStatus || null);
                setMyPaymentDueAt(myParticipation?.paymentDueAt || null);
            } else {
                setIsParticipant(false);
                setMyBookingStatus(null);
                setMyBookingId(null);
                setMyPaymentStatus(null);
                setMyPaymentDueAt(null);
            }

        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Não foi possível carregar o evento.');
            router.back();
        } finally {
            setLoading(false);
        }
    }, [id, router]);

    useFocusEffect(React.useCallback(() => {
        if (id) void fetchEventDetails();
        const timer = setInterval(() => { if (id) void fetchEventDetails(true); }, 15_000);
        return () => clearInterval(timer);
    }, [fetchEventDetails, id]));

    async function handleJoin() {
        if (!event) return;
        if (registrationClosed) {
            Alert.alert('Inscrições encerradas', 'O prazo para participar deste evento terminou.');
            return;
        }
        router.push(`/events/${id}/join`);
    }

    async function handleResetExpiredApproval() {
        if (!event || !currentUserId || joining) return;
        setJoining(true);
        try {
            await registrationService.cancelBooking(event.id, currentUserId);
            await fetchEventDetails();
            router.push(`/events/${id}/join`);
        } catch (error: any) {
            Alert.alert('Erro', friendlyErrorMessage(error, 'Não foi possível liberar a vaga vencida.'));
        } finally {
            setJoining(false);
        }
    }

    const openMaps = async () => {
        if (!event) return;

        const { latitude, longitude, title } = event;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

        const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
        const latLng = `${latitude},${longitude}`;
        const label = title;
        const url = Platform.select({
            ios: `${scheme}${label}@${latLng}`,
            android: `${scheme}${latLng}(${label})`
        });

        if (url) {
            try {
                const supported = await Linking.canOpenURL(url);
                if (supported) {
                    await Linking.openURL(url);
                } else {
                    Alert.alert('Erro', 'Não foi possível abrir o mapa.');
                }
            } catch (error) {
                Alert.alert('Erro', 'Ocorreu um erro ao tentar abrir o mapa.');
            }
        }
    };

    const handleContactHost = async () => {
        if (!event || joining) return;
        setJoining(true);
        try {
            const conversation = await chatService.open(event.id);
            router.push(`/messages/${conversation.id}` as any);
        } catch (error: any) {
            Alert.alert('Não foi possível abrir o chat', friendlyErrorMessage(error, 'Tente novamente.'));
        } finally {
            setJoining(false);
        }
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Confira este evento: ${event?.title} no Wellcome!`,
            });
        } catch (error) {
            // ignore
        }
    };

    const handleCreateReview = async (rating: number, comment: string) => {
        if (!event || !currentUserId) return;
        
        try {
            setSubmittingReview(true);
            await reviewService.create({
                eventId: event.id,
                userId: currentUserId,
                rating,
                comment
            });
            
            Alert.alert('Sucesso', 'Sua avaliação foi enviada!');
            await fetchEventDetails();
        } catch (error: any) {
            Alert.alert('Erro', friendlyErrorMessage(error, 'Não foi possível enviar a avaliação'));
        } finally {
            setSubmittingReview(false);
        }
    };

    const handleDeleteReview = (reviewId: string) => {
        if (!currentUserId) return;

        Alert.alert(
            'Excluir avaliação',
            'Tem certeza que deseja excluir sua avaliação?',
            [
                { text: 'Cancelar', style: 'cancel' },
                { 
                    text: 'Excluir', 
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await reviewService.delete(reviewId, currentUserId);
                            await fetchEventDetails();
                        } catch (error: any) {
                            Alert.alert('Erro', 'Não foi possível excluir a avaliação');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color={Palette.orange} />
            </View>
        );
    }

    if (!event) return null;

    const date = new Date(event.eventDate);
    const spotsAvailable = Math.max(0, event.maxGuests - participantCount);
    const isFull = spotsAvailable === 0;
    const hostName = event.host?.fullName || event.host?.username || 'Anfitrião';
    const optimizedCoverImage = getOptimizedImageUrl(event.coverImageUrl, { width: 800 });
    const optimizedHostAvatar = getOptimizedImageUrl(event.host?.avatarUrl, { width: 100 });
    const hasExactLocation = Number.isFinite(event.latitude) && Number.isFinite(event.longitude);
    const mapCoordinate = hasExactLocation
        ? { latitude: event.latitude as number, longitude: event.longitude as number }
        : null;
    const isPaidEvent = Number(event.price) > 0;
    const requiresHostApproval =
        event.requiresApproval === true || event.accessType === 'OPEN_WITH_APPROVAL';
    const paymentConfirmed = myPaymentStatus === 'CONFIRMED' || myPaymentStatus === 'PARTIALLY_REFUNDED';
    const paymentWindowExpired = Boolean(
        myBookingStatus === 'EXPIRED'
        // eslint-disable-next-line react-hooks/purity -- deadline is re-checked on every render by design
        || (myPaymentDueAt && new Date(myPaymentDueAt).getTime() <= Date.now() && !paymentConfirmed)
    );
    const canPayForCurrentStatus = canPayRegistration({ status: myBookingStatus, paymentStatus: myPaymentStatus, paymentDueAt: myPaymentDueAt });
    const canContinuePayment = !isHost
        && isParticipant
        && isPaidEvent
        && Boolean(myBookingId)
        && canPayForCurrentStatus
        && !paymentConfirmed
        && !paymentWindowExpired;
    const canViewTicket = isParticipant
        && myBookingStatus === 'APPROVED'
        && (!isPaidEvent || paymentConfirmed);
    const flow = registrationFlow({ status: myBookingStatus, paymentStatus: myPaymentStatus, paymentDueAt: myPaymentDueAt }, isPaidEvent, requiresHostApproval);
    const participantFlowStatus = !isHost && isParticipant ? {
        icon: canViewTicket ? 'checkmark-circle-outline' : 'information-circle-outline',
        title: flow.label,
        description: flow.description,
        background: canViewTicket ? Palette.greenSoft : Palette.orangeSoft,
        iconColor: canViewTicket ? Palette.green : Palette.orangeDeep,
        titleColor: canViewTicket ? Palette.green : Palette.orangeDarker,
    } : null;
    const pendingRegistrationCount = event.pendingRegistrationCount ?? 0;
    const confirmedRegistrationCount = event.confirmedRegistrationCount ?? 0;
    const registrationsTargetTab = pendingRegistrationCount > 0 ? 'pending' : 'confirmed';
    
    // Group dishes by category
    const groupedDishes = event.dishes?.reduce((acc: any, dish) => {
        const cat = dish.category || 'OUTROS';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(dish);
        return acc;
    }, {});

    const categoryOrder = ['ENTRADA', 'PRATO_PRINCIPAL', 'SOBREMESA', 'BEBIDA'];
    const sortedCategories = Object.keys(groupedDishes || {}).sort((a, b) => {
        const idxA = categoryOrder.indexOf(a);
        const idxB = categoryOrder.indexOf(b);
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });

    const hasPending = pendingRegistrationCount > 0;
    const bottomBarPadding = { paddingBottom: Math.max(insets.bottom, Spacing.lg) + Spacing.sm };
    const joinDisabled = isFull && !event.allowWaitlist;

    return (
        <View style={styles.screen}>
            <StatusBar style="light" />
            <KeyboardAwareScrollView
                enableOnAndroid={true}
                extraScrollHeight={40}
                extraHeight={120}
                enableResetScrollToCoords={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Image */}
                <View style={styles.hero}>
                    <Image
                        source={{ uri: optimizedCoverImage || DEFAULT_PLACEHOLDER_IMAGE }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                        transition={200}
                        cachePolicy="memory-disk"
                    />
                    <LinearGradient
                        colors={['rgba(0,0,0,0.3)', 'transparent']}
                        style={styles.heroGradient}
                    />

                    {/* Header Buttons */}
                    <View style={[styles.heroButtons, { top: insets.top + 10 }]}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={styles.heroButton}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel="Voltar"
                        >
                            <Ionicons name="chevron-back" size={24} color={Palette.ink} />
                        </TouchableOpacity>
                        <View style={styles.heroButtonGroup}>
                            {!isHost && (
                                <TouchableOpacity
                                    onPress={() => setReportVisible(true)}
                                    style={styles.heroButton}
                                    activeOpacity={0.8}
                                    accessibilityRole="button"
                                    accessibilityLabel="Denunciar evento"
                                >
                                    <Ionicons name="flag-outline" size={20} color={Palette.danger} />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                onPress={handleShare}
                                style={styles.heroButton}
                                activeOpacity={0.8}
                                accessibilityRole="button"
                                accessibilityLabel="Compartilhar evento"
                            >
                                <Ionicons name="share-outline" size={22} color={Palette.ink} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View style={styles.sheet}>
                    {/* Title */}
                    <Text style={styles.title}>{event.title}</Text>

                    {participantFlowStatus && (
                        <View style={[styles.banner, { backgroundColor: participantFlowStatus.background }]}>
                            <Ionicons
                                name={participantFlowStatus.icon as any}
                                size={22}
                                color={participantFlowStatus.iconColor}
                            />
                            <View style={styles.flex}>
                                <Text style={[styles.bannerTitle, { color: participantFlowStatus.titleColor }]}>
                                    {participantFlowStatus.title}
                                </Text>
                                <Text style={styles.bannerText}>{participantFlowStatus.description}</Text>
                            </View>
                        </View>
                    )}

                    {isHost && (
                        <TouchableOpacity
                            style={[styles.manageCard, hasPending && styles.manageCardPending]}
                            onPress={() => router.push(('/events/' + id + '/registrations?tab=' + registrationsTargetTab) as any)}
                            accessibilityRole="button"
                            accessibilityLabel={hasPending
                                ? pendingRegistrationCount + ' inscrições aguardando análise'
                                : 'Gerenciar inscrições do evento'
                            }
                            accessibilityHint="Abre a lista de participantes"
                        >
                            <View style={[styles.manageIcon, hasPending && styles.manageIconPending]}>
                                <Ionicons
                                    name={hasPending ? 'person-add-outline' : 'people-outline'}
                                    size={22}
                                    color={hasPending ? Palette.orangeDeep : Palette.inkSoft}
                                />
                            </View>
                            <View style={styles.flex}>
                                <Text style={[styles.manageTitle, hasPending && { color: Palette.orangeDarker }]}>
                                    {hasPending
                                        ? pendingRegistrationCount + (pendingRegistrationCount === 1 ? ' inscrição pendente' : ' inscrições pendentes')
                                        : 'Gerenciar inscrições'
                                    }
                                </Text>
                                <Text style={styles.manageSubtitle}>
                                    {confirmedRegistrationCount} {confirmedRegistrationCount === 1 ? 'participante confirmado' : 'participantes confirmados'}
                                </Text>
                            </View>
                            {hasPending && (
                                <View style={styles.reviewPill}>
                                    <Text style={styles.reviewPillText}>REVISAR</Text>
                                </View>
                            )}
                            <Ionicons name="chevron-forward" size={20} color={hasPending ? Palette.orangeDeep : Palette.muted} />
                        </TouchableOpacity>
                    )}

                    {/* Host Mini Profile */}
                    <View style={styles.hostRow}>
                        <Image
                            source={{ uri: optimizedHostAvatar || DEFAULT_AVATAR_PLACEHOLDER }}
                            style={styles.hostRowAvatar}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                        />
                        <View style={styles.flex}>
                            <View style={styles.inlineRow}>
                                <Text style={styles.hostRowName} numberOfLines={1}>{hostName}</Text>
                                <Ionicons name="checkmark-circle" size={16} color={Palette.orange} />
                            </View>
                            <Text style={styles.hostRowMeta} numberOfLines={1}>
                                {event.location || event.host?.neighborhood || 'Localização não informada'}
                            </Text>
                        </View>
                    </View>

                    {/* Info Grid */}
                    <View style={styles.tiles}>
                        {/* Spots */}
                        <View style={styles.tile}>
                            <View style={styles.tileIcon}>
                                <Ionicons name="people-outline" size={20} color={Palette.orangeDeep} />
                            </View>
                            <Text style={styles.tileTitle}>{event.maxGuests} lugares</Text>
                            <View style={styles.inlineRow}>
                                <Text style={styles.tileAccent}>{spotsAvailable} disponíveis</Text>
                                <Ionicons name="information-circle-outline" size={12} color={Palette.orangeDeep} />
                            </View>
                        </View>

                        {/* Price */}
                        <View style={styles.tile}>
                            <View style={styles.tileIcon}>
                                <Ionicons name="cash-outline" size={20} color={Palette.orangeDeep} />
                            </View>
                            <Text style={styles.tilePrice}>{formatPrice(event.price)}</Text>
                            <Text style={styles.tileMeta}>por convidado</Text>
                        </View>

                        {/* Type/Time */}
                        <View style={styles.tile}>
                            <View style={styles.tileIcon}>
                                <Ionicons name="restaurant-outline" size={20} color={Palette.orangeDeep} />
                            </View>
                            <Text style={styles.tileTitle}>{event.eventType || 'Evento'}</Text>
                            <Text style={styles.tileMeta}>
                                {event.endTime
                                    ? `das ${new Date(event.eventDate).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})} às ${new Date(event.endTime).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}`
                                    : 'Horário a definir'}
                            </Text>
                        </View>

                        {/* Date */}
                        <View style={styles.tile}>
                            <View style={styles.tileIcon}>
                                <Ionicons name="calendar-outline" size={20} color={Palette.orangeDeep} />
                            </View>
                            <Text style={styles.tileTitle}>
                                {date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                            </Text>
                            <Text style={styles.tileMeta}>
                                {event.reservationDeadline
                                    ? `Reservas até ${new Date(event.reservationDeadline).toLocaleDateString('pt-BR', { day: 'numeric', month: '2-digit' })}`
                                    : 'Sem prazo'}
                            </Text>
                        </View>
                    </View>

                    {/* Description */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>O evento</Text>
                        <Text style={styles.body}>{event.description}</Text>
                    </View>

                    {/* Menu */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Cardápio</Text>

                        <View style={styles.card}>
                            {sortedCategories.length > 0 ? (
                                <View style={styles.menuList}>
                                    {sortedCategories.map((category) => (
                                        <View key={category} style={styles.menuCategory}>
                                            <View style={styles.menuDot} />
                                            <Text style={styles.menuCategoryLabel}>
                                                {category.replace('_', ' ')}
                                            </Text>
                                            <View style={styles.menuDishes}>
                                                {groupedDishes[category].map((dish: any, dishIdx: number) => (
                                                    <View key={dishIdx}>
                                                        <Text style={styles.dishName}>{dish.name}</Text>
                                                        {dish.description && (
                                                            <Text style={styles.dishDescription}>{dish.description}</Text>
                                                        )}
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                <Text style={styles.emptyText}>O cardápio ainda não foi definido pelo anfitrião.</Text>
                            )}

                            {/* Dietary Options */}
                            <View style={styles.dietary}>
                                {event.dietaryOptions?.map((option, idx) => (
                                    <View key={idx} style={styles.dietaryChip}>
                                        <Ionicons name="checkmark" size={14} color={Palette.green} />
                                        <Text style={styles.dietaryChipText}>{option}</Text>
                                    </View>
                                ))}
                                {(!event.dietaryOptions || event.dietaryOptions.length === 0) && (
                                    <Text style={styles.emptyTextSmall}>Nenhuma opção dietética específica informada.</Text>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Host Full Profile */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Seu anfitrião(a)</Text>
                        <View style={styles.card}>
                            <View style={styles.hostHeader}>
                                <View style={[styles.inlineRow, styles.flex]}>
                                    <Image
                                        source={{ uri: optimizedHostAvatar || DEFAULT_AVATAR_PLACEHOLDER }}
                                        style={styles.hostAvatar}
                                        contentFit="cover"
                                    />
                                    <View style={[styles.flex, { marginLeft: Spacing.md }]}>
                                        <Text style={styles.hostHello}>Olá, eu sou</Text>
                                        <Text style={styles.hostName}>
                                            {hostName.split(' ')[0]} {hostName.split(' ')[1] || ''}
                                        </Text>
                                        {event.host?.isSuperhost && (
                                            <View style={styles.superhostPill}>
                                                <Text style={styles.superhostText}>SUPERHOST</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                                <View style={styles.ratingChip}>
                                    <Ionicons name="star" size={14} color={Palette.star} />
                                    <Text style={styles.ratingChipText}>4.9</Text>
                                </View>
                            </View>

                            <View style={styles.hostFacts}>
                                {event.host?.birthDecade && (
                                    <View style={styles.inlineRow}>
                                        <Ionicons name="star-outline" size={18} color={Palette.orangeDeep} />
                                        <Text style={styles.hostFact}>{event.host.birthDecade}</Text>
                                    </View>
                                )}
                                {event.host?.occupation && (
                                    <View style={styles.inlineRow}>
                                        <Ionicons name="briefcase-outline" size={18} color={Palette.orangeDeep} />
                                        <Text style={styles.hostFact}>Trabalho: {event.host.occupation}</Text>
                                    </View>
                                )}
                                {event.host?.pets && (
                                    <View style={styles.inlineRow}>
                                        <Ionicons name="paw-outline" size={18} color={Palette.orangeDeep} />
                                        <Text style={styles.hostFact}>{event.host.pets}</Text>
                                    </View>
                                )}
                                {event.host?.languages && event.host.languages.length > 0 && (
                                    <View style={styles.inlineRow}>
                                        <Ionicons name="chatbubble-outline" size={18} color={Palette.orangeDeep} />
                                        <Text style={styles.hostFact}>Fala: {event.host.languages.join(', ')}</Text>
                                    </View>
                                )}
                            </View>

                            <Text style={styles.body}>
                                {event.host?.bio || `Sou ${hostName}, adoro receber pessoas e cozinhar!`}
                            </Text>

                            {/* Contact Host Button */}
                            {!isHost && (
                                <TouchableOpacity
                                    style={[styles.outlineButton, joining && styles.disabled]}
                                    onPress={handleContactHost}
                                    disabled={joining}
                                    accessibilityRole="button"
                                    accessibilityState={{ disabled: joining }}
                                >
                                    {joining ? <ActivityIndicator size="small" color={Palette.orange} /> : <Ionicons name="chatbubble-ellipses-outline" size={20} color={Palette.ink} />}
                                    <Text style={styles.outlineButtonText}>Perguntar ao anfitrião</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Reviews Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            Avaliações ({event.reviews?.length || 0})
                        </Text>

                        {isParticipant && !isHost && !userHasReviewed && isPastEvent && (
                            <ReviewForm
                                onSubmit={handleCreateReview}
                                loading={submittingReview}
                            />
                        )}

                        <ReviewList
                            reviews={event.reviews || []}
                            onDelete={handleDeleteReview}
                            currentUserId={currentUserId || undefined}
                        />
                    </View>

                    {/* Location */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Sobre o local</Text>

                        <View style={styles.mapBox}>
                            {mapCoordinate ? (
                                <>
                                    <MapView
                                        style={{ width: '100%', height: '100%' }}
                                        initialRegion={{
                                            ...mapCoordinate,
                                            latitudeDelta: 0.008,
                                            longitudeDelta: 0.008
                                        }}
                                        scrollEnabled={false}
                                        zoomEnabled={false}
                                        rotateEnabled={false}
                                        pitchEnabled={false}
                                        toolbarEnabled={false}
                                        liteMode={Platform.OS === 'android'}
                                        onPress={openMaps}
                                        accessibilityLabel="Mapa do local do evento"
                                    >
                                        <Marker coordinate={mapCoordinate} />
                                    </MapView>

                                    <TouchableOpacity
                                        style={styles.mapButton}
                                        activeOpacity={0.9}
                                        onPress={openMaps}
                                        accessibilityRole="button"
                                        accessibilityLabel="Abrir local no aplicativo de mapas"
                                    >
                                        <Ionicons name="navigate-circle-outline" size={18} color={Palette.orangeDeep} />
                                        <Text style={styles.mapButtonText}>Abrir mapa</Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <TouchableOpacity
                                    style={styles.mapPlaceholder}
                                    activeOpacity={0.9}
                                    onPress={openMaps}
                                    accessibilityRole="button"
                                    accessibilityLabel="Local exato disponível após confirmação"
                                >
                                    <Ionicons name="map" size={36} color={Palette.subtle} />
                                    <Text style={styles.mapPlaceholderText}>Local exato disponível após confirmação</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <TouchableOpacity
                            onPress={openMaps}
                            style={styles.addressRow}
                            accessibilityRole="button"
                        >
                            <Ionicons name="location-outline" size={18} color={Palette.muted} />
                            <Text style={styles.addressText}>
                                {event.location || event.host?.neighborhood}, Florianópolis
                            </Text>
                            <Ionicons name="navigate-circle-outline" size={20} color={Palette.orangeDeep} />
                        </TouchableOpacity>

                        <View style={styles.amenities}>
                            {(event.facilities || []).map((facility, idx) => {
                                // Simple mapping logic if keys are used, otherwise use text directly
                                const mapped = FACILITY_ICONS[facility] || { icon: 'checkmark-circle-outline', label: facility };
                                return (
                                    <View key={idx} style={styles.inlineRow}>
                                        <Ionicons name={mapped.icon as any} size={16} color={Palette.inkSoft} />
                                        <Text style={styles.amenityText}>{mapped.label}</Text>
                                    </View>
                                );
                            })}

                            {(event.rules || []).map((rule, idx) => {
                                const mapped = RULE_ICONS[rule] || { icon: 'alert-circle-outline', label: rule, positive: false };
                                return (
                                    <View key={idx} style={styles.inlineRow}>
                                        <Ionicons name={mapped.icon as any} size={16} color={mapped.positive ? Palette.green : Palette.danger} />
                                        <Text style={styles.amenityText}>{mapped.label}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                </View>
            </KeyboardAwareScrollView>

            {/* Action Bar - Participant: Resume pending payment */}
            {canContinuePayment && (
                <View style={[styles.bottomBar, bottomBarPadding]}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => router.push(`/events/${id}/payment?bookingId=${myBookingId}`)}
                        accessibilityRole="button"
                    >
                        <Ionicons name="card-outline" size={20} color="#FFFFFF" />
                        <Text style={styles.primaryButtonText}>Continuar pagamento</Text>
                    </TouchableOpacity>
                </View>
            )}

            {paymentWindowExpired && isParticipant && !isHost && (
                <View style={[styles.bottomBar, bottomBarPadding]}>
                    <TouchableOpacity
                        style={[styles.primaryButton, joining && styles.disabled]}
                        onPress={handleResetExpiredApproval}
                        disabled={joining}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: joining }}
                    >
                        {joining
                            ? <ActivityIndicator color="#FFFFFF" />
                            : <>
                                <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
                                <Text style={styles.primaryButtonText}>Solicitar vaga novamente</Text>
                            </>}
                    </TouchableOpacity>
                </View>
            )}

            {/* Action Bar - Participant: View Ticket (approved) */}
            {canViewTicket && (
                <View style={[styles.bottomBar, bottomBarPadding]}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => router.push(`/events/${id}/ticket`)}
                        accessibilityRole="button"
                    >
                        <Ionicons name="qr-code-outline" size={20} color="#FFFFFF" />
                        <Text style={styles.primaryButtonText}>Ver ingresso</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Action Bar - Host: Scan Tickets */}
            {isHost && (
                <View style={[styles.bottomBar, bottomBarPadding]}>
                    <View style={styles.bottomRow}>
                        <TouchableOpacity
                            style={[styles.primaryButton, styles.flex]}
                            onPress={() => router.push(`/events/${id}/scanner`)}
                            accessibilityRole="button"
                        >
                            <Ionicons name="scan-outline" size={20} color="#FFFFFF" />
                            <Text style={styles.primaryButtonText}>Escanear</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.outlineButton, styles.flex, { marginTop: 0 }]}
                            onPress={() => router.push(`/events/${id}/registrations`)}
                            accessibilityRole="button"
                        >
                            <Ionicons name="people-outline" size={20} color={Palette.ink} />
                            <Text style={styles.outlineButtonText}>
                                {hasPending ? 'Pendentes (' + pendingRegistrationCount + ')' : 'Inscrições'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Action Bar - Join Event (not participant, not host) */}
            {!isHost && !isParticipant && !registrationClosed && (
                <View style={[styles.bottomBar, bottomBarPadding]}>
                    <View style={styles.bottomRow}>
                        <View style={styles.flex}>
                            <Text style={styles.totalLabel}>TOTAL</Text>
                            <View style={styles.priceRow}>
                                <Text style={styles.totalPrice}>R$ {event.price}</Text>
                                <Text style={styles.totalUnit}>/ pessoa</Text>
                            </View>
                            {requiresHostApproval && (
                                <Text style={styles.approvalHint}>Exige aprovação do anfitrião</Text>
                            )}
                        </View>

                        <TouchableOpacity
                            style={[styles.primaryButton, styles.joinButton, joinDisabled && styles.joinButtonDisabled]}
                            onPress={handleJoin}
                            disabled={joinDisabled}
                            accessibilityRole="button"
                            accessibilityState={{ disabled: joinDisabled }}
                        >
                            <Text style={[styles.primaryButtonText, joinDisabled && { color: Palette.muted }]}>
                                {isFull
                                    ? event.allowWaitlist ? 'Entrar na lista de espera' : 'Esgotado'
                                    : requiresHostApproval ? 'Solicitar vaga' : 'Participar'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <ReportSheet
                visible={reportVisible}
                onClose={() => setReportVisible(false)}
                targetType="EVENT"
                targetId={id as string}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: Palette.paper },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Palette.paper },
    scroll: { flex: 1 },
    flex: { flex: 1 },
    inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    hero: { height: 300, width: '100%', backgroundColor: Palette.track },
    heroGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 96 },
    heroButtons: {
        position: 'absolute',
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
    },
    heroButtonGroup: { flexDirection: 'row', gap: Spacing.sm },
    heroButton: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.full,
        backgroundColor: Palette.surface,
        alignItems: 'center',
        justifyContent: 'center',
        ...Elevation.card,
    },
    sheet: {
        marginTop: -BorderRadius.sheet,
        backgroundColor: Palette.paper,
        borderTopLeftRadius: BorderRadius.sheet,
        borderTopRightRadius: BorderRadius.sheet,
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.xxl,
        paddingBottom: Spacing.xxxl,
    },
    title: {
        fontSize: 26,
        lineHeight: 32,
        fontWeight: '800',
        letterSpacing: -0.5,
        color: Palette.ink,
        marginBottom: Spacing.lg,
    },
    banner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.md,
        borderRadius: 22,
        padding: 14,
        marginBottom: Spacing.lg,
    },
    bannerTitle: { fontSize: 14, fontWeight: '800' },
    bannerText: { fontSize: 13, lineHeight: 19, color: Palette.inkSoft, marginTop: 3 },
    manageCard: {
        minHeight: 72,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        backgroundColor: Palette.surface,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        borderRadius: 22,
        padding: 14,
        marginBottom: Spacing.lg,
    },
    manageCardPending: { backgroundColor: Palette.orangeSoft, borderColor: Palette.orangeSoft },
    manageIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Palette.track,
        alignItems: 'center',
        justifyContent: 'center',
    },
    manageIconPending: { backgroundColor: Palette.surface },
    manageTitle: { fontSize: 15, fontWeight: '800', color: Palette.ink },
    manageSubtitle: { fontSize: 13, color: Palette.inkSoft, marginTop: 2 },
    reviewPill: {
        backgroundColor: Palette.orangeDeep,
        borderRadius: BorderRadius.full,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    reviewPillText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4, color: '#FFFFFF' },
    hostRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        marginBottom: Spacing.xl,
    },
    hostRowAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: Palette.surface,
        backgroundColor: Palette.track,
    },
    hostRowName: { flexShrink: 1, fontSize: 16, fontWeight: '800', color: Palette.ink },
    hostRowMeta: { fontSize: 14, color: Palette.inkSoft, marginTop: 2 },
    tiles: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: Spacing.md,
        marginBottom: Spacing.xxl,
    },
    tile: {
        width: '48%',
        backgroundColor: Palette.surface,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        borderRadius: 22,
        padding: 14,
        gap: 4,
    },
    tileIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Palette.orangeSoft,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm,
    },
    tileTitle: { fontSize: 15, fontWeight: '800', color: Palette.ink },
    tilePrice: { fontSize: 20, fontWeight: '800', color: Palette.ink },
    tileMeta: { fontSize: 12, color: Palette.inkSoft },
    tileAccent: { fontSize: 12, fontWeight: '700', color: Palette.orangeDeep },
    section: { marginBottom: Spacing.xxl },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: Palette.ink, marginBottom: Spacing.md },
    body: { fontSize: 15, lineHeight: 22, color: Palette.inkSoft },
    card: {
        backgroundColor: Palette.surface,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        borderRadius: 22,
        padding: Spacing.lg,
    },
    menuList: { paddingLeft: 4 },
    menuCategory: {
        position: 'relative',
        paddingLeft: Spacing.xl,
        paddingBottom: Spacing.lg,
        borderLeftWidth: 2,
        borderLeftColor: Palette.orangeSoft,
    },
    menuDot: {
        position: 'absolute',
        left: -5,
        top: 3,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Palette.orange,
    },
    menuCategoryLabel: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: Palette.muted,
        marginBottom: Spacing.sm,
    },
    menuDishes: { gap: Spacing.md },
    dishName: { fontSize: 15, fontWeight: '800', color: Palette.ink, marginBottom: 2 },
    dishDescription: { fontSize: 14, lineHeight: 20, color: Palette.inkSoft },
    emptyText: { fontSize: 14, fontStyle: 'italic', color: Palette.muted, marginBottom: Spacing.md },
    emptyTextSmall: { fontSize: 12, fontStyle: 'italic', color: Palette.muted },
    dietary: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Palette.lineSoft,
    },
    dietaryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: Palette.greenSoft,
        borderRadius: BorderRadius.full,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    dietaryChipText: { fontSize: 12, fontWeight: '700', color: Palette.green },
    hostHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    hostAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: Palette.track },
    hostHello: { fontSize: 13, color: Palette.muted },
    hostName: { fontSize: 17, fontWeight: '800', color: Palette.ink, marginBottom: 4 },
    superhostPill: {
        alignSelf: 'flex-start',
        backgroundColor: Palette.orange,
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
    },
    superhostText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6, color: '#FFFFFF' },
    ratingChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: Palette.paper,
        borderRadius: BorderRadius.full,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    ratingChipText: { fontSize: 12, fontWeight: '800', color: Palette.ink },
    hostFacts: { gap: 10, marginBottom: Spacing.lg },
    hostFact: { flex: 1, fontSize: 14, color: Palette.inkSoft, marginLeft: 6 },
    mapBox: {
        height: 180,
        borderRadius: 22,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        backgroundColor: Palette.track,
        marginBottom: Spacing.md,
    },
    mapButton: {
        position: 'absolute',
        right: Spacing.md,
        bottom: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        minHeight: 36,
        paddingHorizontal: Spacing.md,
        backgroundColor: Palette.surface,
        borderRadius: BorderRadius.full,
        ...Elevation.card,
    },
    mapButtonText: { fontSize: 13, fontWeight: '800', color: Palette.ink },
    mapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.lg },
    mapPlaceholderText: { fontSize: 14, color: Palette.inkSoft, textAlign: 'center' },
    addressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 44, marginBottom: Spacing.md },
    addressText: { flex: 1, fontSize: 14, color: Palette.inkSoft },
    amenities: { gap: Spacing.sm },
    amenityText: { flex: 1, fontSize: 13, color: Palette.inkSoft, marginLeft: 2 },
    outlineButton: {
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Palette.line,
        backgroundColor: Palette.surface,
        paddingHorizontal: Spacing.lg,
        marginTop: Spacing.lg,
    },
    outlineButtonText: { fontSize: 15, fontWeight: '800', color: Palette.ink },
    disabled: { opacity: 0.6 },
    bottomBar: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: Palette.surface,
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.lg,
        borderTopLeftRadius: BorderRadius.sheet,
        borderTopRightRadius: BorderRadius.sheet,
        borderTopWidth: 1,
        borderColor: Palette.lineSoft,
        ...Elevation.floating,
    },
    bottomRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    primaryButton: {
        minHeight: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        borderRadius: BorderRadius.full,
        backgroundColor: Palette.orange,
        paddingHorizontal: Spacing.xl,
    },
    primaryButtonText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
    joinButton: { paddingHorizontal: Spacing.xxl, flexShrink: 1 },
    joinButtonDisabled: { backgroundColor: Palette.track },
    totalLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: Palette.muted },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    totalPrice: { fontSize: 24, fontWeight: '800', color: Palette.ink },
    totalUnit: { fontSize: 14, color: Palette.inkSoft },
    approvalHint: { fontSize: 11, fontWeight: '700', color: Palette.orangeDeep, marginTop: 2 },
});
