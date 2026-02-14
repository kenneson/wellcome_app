import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Share, FlatList, Dimensions, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/shared/lib/supabase';
import { DEFAULT_PLACEHOLDER_IMAGE, DEFAULT_AVATAR_PLACEHOLDER } from '@/shared/lib/styles';
import { formatPrice } from '@/utils/formatters';
import { eventService } from '@/services/api/EventService';
import { Event } from '@/entities/event/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function EventDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [isParticipant, setIsParticipant] = useState(false);
    const [isHost, setIsHost] = useState(false);
    const [participationStatus, setParticipationStatus] = useState<string | null>(null);
    const [participantCount, setParticipantCount] = useState(0);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const carouselRef = useRef<FlatList>(null);

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setCurrentImageIndex(viewableItems[0].index || 0);
        }
    }).current;

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50
    }).current;

    useEffect(() => {
        if (id) fetchEventDetails();
    }, [id]);

    async function fetchEventDetails() {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            const currentUserId = session?.user?.id;

            const eventData = await eventService.getEventById(id as string);
            setEvent(eventData);

            if (currentUserId && eventData.hostId === currentUserId) {
                setIsHost(true);
            }

            // Check participation from bookings
            if (currentUserId && eventData.bookings) {
                const myParticipation = eventData.bookings.find(b => b.userId === currentUserId);
                setIsParticipant(!!myParticipation);
                if (myParticipation) {
                    setParticipationStatus(myParticipation.status);
                }
                const validBookings = eventData.bookings.filter(b => b.status === 'APPROVED' || b.status === 'PENDING');
                setParticipantCount(validBookings.length);
            } else {
                setParticipantCount(0);
            }

        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Não foi possível carregar o evento.');
            router.back();
        } finally {
            setLoading(false);
        }
    }

    async function handleJoin() {
        if (!event) return;
        router.push(`/events/${id}/join`);
    }

    async function handleLeave() {
        setJoining(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { error } = await supabase
                .from('event_participants')
                .delete()
                .eq('event_id', event!.id)
                .eq('user_id', session.user.id);

            if (error) throw error;

            setIsParticipant(false);
            setParticipationStatus(null);
            setParticipantCount(prev => Math.max(0, prev - 1));

            // Refetch to be safe
            fetchEventDetails();

        } catch (error) {
            Alert.alert('Erro', 'Falha ao cancelar participação.');
        } finally {
            setJoining(false);
        }
    }

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Confira este evento: ${event?.title} no Wellcome!`,
            });
        } catch (error) {
            // ignore
        }
    };

    if (loading) {
        return (
            <View style={s.loadingContainer}>
                <ActivityIndicator size="large" color="#FF8C42" />
            </View>
        );
    }

    if (!event) return null;

    const isFull = participantCount >= (event.maxGuests || 0);
    const date = new Date(event.eventDate);
    const spotsAvailable = Math.max(0, event.maxGuests - participantCount);

    const eventImages = event.imageGallery && event.imageGallery.length > 0
        ? event.imageGallery
        : [event.coverImageUrl || DEFAULT_PLACEHOLDER_IMAGE];

    // ────────────────────────────────────────────────────────
    // RENDER
    // ────────────────────────────────────────────────────────

    const hostDisplayName = event.host?.fullName || event.host?.username || (isHost ? 'Você' : 'Anfitrião');

    return (
        <View style={s.root}>
            <ScrollView style={s.scrollView} contentContainerStyle={{ paddingBottom: 140 }}>

                {/* ═══════ Hero Image Carousel ═══════ */}
                <View style={s.heroContainer}>
                    <FlatList
                        ref={carouselRef}
                        data={eventImages}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onViewableItemsChanged={onViewableItemsChanged}
                        viewabilityConfig={viewabilityConfig}
                        keyExtractor={(_, index) => `image-${index}`}
                        renderItem={({ item }) => (
                            <Image
                                source={{ uri: item }}
                                style={{ width: SCREEN_WIDTH, height: 360 }}
                                contentFit="cover"
                                transition={200}
                                placeholder={DEFAULT_PLACEHOLDER_IMAGE}
                            />
                        )}
                    />

                    {/* Pagination Dots */}
                    {eventImages.length > 1 && (
                        <View style={s.dotsContainer}>
                            {eventImages.map((_: any, index: number) => (
                                <View
                                    key={`dot-${index}`}
                                    style={[
                                        s.dot,
                                        index === currentImageIndex ? s.dotActive : s.dotInactive,
                                    ]}
                                />
                            ))}
                        </View>
                    )}

                    {/* Floating Header Actions */}
                    <View style={[s.headerActions, { paddingTop: insets.top + 10 }]}>
                        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} activeOpacity={0.8}>
                            <Ionicons name="chevron-back" size={24} color="#FF8C42" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleShare} style={s.headerBtn} activeOpacity={0.8}>
                            <Ionicons name="share-outline" size={24} color="#FF8C42" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ═══════ Main Content ═══════ */}
                <View style={s.content}>

                    {/* Title */}
                    <Text style={s.title}>{event.title || 'Evento sem título'}</Text>

                    {/* Host Mini Profile */}
                    <View style={s.hostRow}>
                        <Image
                            source={{ uri: event.host?.avatarUrl || DEFAULT_AVATAR_PLACEHOLDER }}
                            style={s.hostAvatar}
                            contentFit="cover"
                            transition={200}
                        />
                        <View style={{ flex: 1 }}>
                            <View style={s.hostNameRow}>
                                <Text style={s.hostName}>{hostDisplayName}</Text>
                                {(event.host?.fullName || event.host?.username) && <Ionicons name="checkmark-circle" size={18} color="#FF8C42" />}
                            </View>
                            <Text style={s.hostLocation}>
                                {event.location || event.host?.neighborhood || 'Localização não informada'}
                            </Text>
                        </View>
                    </View>

                    {/* ═══════ Quick Info 2x2 Grid ═══════ */}
                    <View style={s.quickInfoGrid}>
                        {/* Row 1 */}
                        <View style={s.quickInfoGridRow}>
                            {/* Spots Card */}
                            <View style={s.quickInfoCard}>
                                <View style={s.quickInfoAvatarsRow}>
                                    <Image
                                        source={{ uri: event.host?.avatarUrl || DEFAULT_AVATAR_PLACEHOLDER }}
                                        style={s.quickInfoAvatarSmall}
                                        contentFit="cover"
                                        transition={200}
                                    />
                                    <View style={s.quickInfoAvatarPlaceholder} />
                                </View>
                                <Text style={s.quickInfoValue}>{event.maxGuests || 0} lugares</Text>
                                <View style={s.quickInfoSubRow}>
                                    <Text style={s.quickInfoSub}>{spotsAvailable} disponíveis</Text>
                                    <Ionicons name="information-circle-outline" size={14} color="#FF8C42" />
                                </View>
                            </View>

                            {/* Price Card */}
                            <View style={s.quickInfoCard}>
                                <Text style={s.priceValue}>{formatPrice(event.price)}</Text>
                                <Text style={s.priceSub}>por convidado</Text>
                            </View>
                        </View>

                        {/* Row 2 */}
                        <View style={s.quickInfoGridRow}>
                            {/* Event Type Card */}
                            <View style={s.quickInfoCard}>
                                <Ionicons name="cafe-outline" size={28} color="#2D3436" style={{ marginBottom: 8 }} />
                                <Text style={s.quickInfoValue}>{event.eventType || 'Evento'}</Text>
                                <Text style={s.quickInfoSub}>
                                    {date && !isNaN(date.getTime())
                                        ? `de ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                                        : 'Horário a definir'}
                                    {event.endTime
                                        ? ` às ${new Date(event.endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                                        : ''}
                                </Text>
                            </View>

                            {/* Date Card */}
                            <View style={s.quickInfoCard}>
                                <Ionicons name="calendar-outline" size={28} color="#2D3436" style={{ marginBottom: 8 }} />
                                <Text style={s.quickInfoValue}>
                                    {date && !isNaN(date.getTime())
                                        ? `${date.toLocaleDateString('pt-BR', { day: 'numeric' })} de ${date.toLocaleDateString('pt-BR', { month: 'long' })}`
                                        : 'Data a definir'}
                                </Text>
                                <Text style={s.quickInfoSub}>
                                    {event.reservationDeadline
                                        ? `Reservas até: ${new Date(event.reservationDeadline).toLocaleDateString('pt-BR', { day: 'numeric', month: '2-digit' })}`
                                        : 'Sem prazo de reserva'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* ═══════ O evento ═══════ */}
                    <View style={s.section}>
                        <Text style={s.sectionTitle}>O evento</Text>
                        <Text style={s.bodyText}>
                            {event.description || 'Nenhuma descrição fornecida pelo anfitrião.'}
                        </Text>
                    </View>

                    {/* ═══════ Cardápio ═══════ */}
                    <View style={s.section}>
                        <Text style={s.sectionTitle}>Cardápio</Text>

                        {event.dishes && event.dishes.length > 0 ? (
                            <View style={s.timeline}>
                                {event.dishes.map((dish: any, index: number) => (
                                    <View key={index} style={s.timelineItem}>
                                        <View style={s.timelineDot} />
                                        <Text style={s.timelineLabel}>
                                            {dish.category || (index === 0 ? 'ENTRADA' : index === event.dishes!.length - 1 ? 'SOBREMESA' : 'PRATO PRINCIPAL')}
                                        </Text>
                                        <Text style={s.timelineDishName}>{dish.name || 'Prato sem nome'}</Text>
                                        {dish.description ? <Text style={s.timelineDishDesc}>{dish.description}</Text> : null}
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <View style={s.timeline}>
                                <Text style={s.bodyText}>Nenhum prato cadastrado.</Text>
                            </View>
                        )}

                        {/* Dietary Info */}
                        {event.dietaryOptions && event.dietaryOptions.length > 0 && (
                            <View style={s.dietaryInfo}>
                                {event.dietaryOptions.map((option: string, idx: number) => (
                                    <View key={idx} style={s.dietaryRow}>
                                        <Ionicons name="checkmark" size={20} color="#2D3436" />
                                        <Text style={s.dietaryText}>{option}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* ═══════ Sua Anfitriã ═══════ */}
                    {event.host && (
                        <View style={s.section}>
                            <Text style={s.sectionTitle}>Sua Anfitriã</Text>

                            <View style={s.hostCard}>
                                {/* Host header */}
                                <View style={s.hostCardHeader}>
                                    <Image
                                        source={{ uri: event.host.avatarUrl || DEFAULT_AVATAR_PLACEHOLDER }}
                                        style={s.hostCardAvatar}
                                    />
                                    <View style={{ flex: 1 }}>
                                        <View style={s.hostCardTopRow}>
                                            <Text style={s.hostCardGreeting}>Olá, eu sou</Text>
                                            <View style={s.ratingBadge}>
                                                <Ionicons name="star" size={14} color="#FF8C42" />
                                                <Text style={s.ratingText}>
                                                    {event.reviews && event.reviews.length > 0
                                                        ? (event.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / event.reviews.length).toFixed(1).replace('.', ',')
                                                        : 'Novo'}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={s.hostCardName}>{hostDisplayName}</Text>
                                        <View style={s.verifiedBadge}>
                                            <Ionicons name="checkmark" size={11} color="#FFF" />
                                            <Text style={s.verifiedText}>VERIFICADO</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Stats list */}
                                <View style={s.statsList}>
                                    {event.host.birthDecade && (
                                        <View style={s.statRow}>
                                            <Ionicons name="star-outline" size={22} color="#FF8C42" />
                                            <Text style={s.statText}>Nasci na década de {event.host.birthDecade}</Text>
                                        </View>
                                    )}
                                    <View style={s.statRow}>
                                        <Ionicons name="briefcase-outline" size={22} color="#FF8C42" />
                                        <Text style={s.statText}>Trabalho: {event.host.occupation || 'Não informado'}</Text>
                                    </View>
                                    {event.host.pets && (
                                        <View style={s.statRow}>
                                            <Ionicons name="paw-outline" size={22} color="#FF8C42" />
                                            <Text style={s.statText}>Pets: {event.host.pets}</Text>
                                        </View>
                                    )}
                                    <View style={s.statRow}>
                                        <Ionicons name="chatbubble-outline" size={22} color="#FF8C42" />
                                        <Text style={s.statText}>
                                            Línguas: {event.host.languages && event.host.languages.length > 0
                                                ? event.host.languages.join(', ')
                                                : 'Português'}
                                        </Text>
                                    </View>
                                </View>

                                <Text style={s.hostBio}>
                                    {event.host.bio || 'Este anfitrião ainda não adicionou uma bio.'}
                                </Text>

                                {event.reviews && event.reviews.length > 0 ? (
                                    <>
                                        <Text style={s.reviewsTitle}>O que dizem sobre seus eventos:</Text>
                                        <View style={{ gap: 12, marginBottom: 16 }}>
                                            {event.reviews.slice(0, 3).map((review: any) => (
                                                <View key={review.id} style={s.reviewCard}>
                                                    <View style={s.starsRow}>
                                                        {[1, 2, 3, 4, 5].map(i => (
                                                            <Ionicons key={i} name={i <= review.rating ? 'star' : 'star-outline'} size={16} color="#FF8C42" />
                                                        ))}
                                                    </View>
                                                    {review.comment && <Text style={s.reviewText}>{review.comment}</Text>}
                                                    <Text style={s.reviewAuthor}>{review.user?.fullName || 'Anônimo'}</Text>
                                                </View>
                                            ))}
                                        </View>
                                        {event.reviews.length > 3 && (
                                            <TouchableOpacity style={s.loadMoreBtn}>
                                                <Text style={s.loadMoreText}>Carregar mais</Text>
                                            </TouchableOpacity>
                                        )}
                                    </>
                                ) : (
                                    <Text style={s.hostBio}>Ainda sem avaliações.</Text>
                                )}
                            </View>
                        </View>
                    )}

                    {/* ═══════ Sobre o local ═══════ */}
                    <View style={s.section}>
                        <Text style={s.sectionTitle}>Sobre o local</Text>

                        {event.latitude && event.longitude ? (
                            <View style={s.mapContainer}>
                                <Image
                                    source={{ uri: `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${event.longitude},${event.latitude},13,0/600x300@2x?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw` }}
                                    style={s.mapImage}
                                    resizeMode="cover"
                                />
                                <View style={s.mapPinContainer}>
                                    <View style={s.mapPin}>
                                        <Ionicons name="location" size={32} color="#fff" />
                                    </View>
                                </View>
                            </View>
                        ) : (
                            <View style={[s.mapContainer, { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }]}>
                                <Ionicons name="map-outline" size={48} color="#9CA3AF" />
                                <Text style={{ color: '#6B7280', marginTop: 8 }}>Mapa indisponível</Text>
                            </View>
                        )}

                        <View style={s.locationLabelRow}>
                            <Text style={s.locationLabel}>{event.location || 'Localização não informada'}</Text>
                            <Ionicons name="information-circle-outline" size={16} color="#FF8C42" />
                        </View>

                        <View style={{ gap: 14 }}>
                            {event.facilities && event.facilities.length > 0 && event.facilities.map((facility: string, idx: number) => (
                                <View key={`f-${idx}`} style={s.amenityRow}>
                                    <Ionicons name="checkmark" size={20} color="#22C55E" />
                                    <Text style={s.amenityText}>{facility}</Text>
                                </View>
                            ))}
                            {event.rules && event.rules.length > 0 && event.rules.map((rule: string, idx: number) => (
                                <View key={`r-${idx}`} style={s.amenityRow}>
                                    <Ionicons name="close" size={20} color="#EF4444" />
                                    <Text style={s.amenityText}>{rule}</Text>
                                </View>
                            ))}
                            {(!event.facilities?.length && !event.rules?.length) && (
                                <Text style={s.bodyText}>Nenhuma informação adicional sobre o local.</Text>
                            )}
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* ═══════ Sticky Footer ═══════ */}
            <View style={[s.footer, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
                <View style={s.footerContent}>
                    <View>
                        <Text style={s.footerPrice}>{formatPrice(event.price)}</Text>
                        <Text style={s.footerPriceSub}>por convidado</Text>
                    </View>

                    {isHost ? (
                        <TouchableOpacity
                            style={[s.footerBtn, { backgroundColor: '#1A1A1A' }]}
                            onPress={() => router.push(`/events/${id}/registrations`)}
                            activeOpacity={0.8}
                        >
                            <Text style={s.footerBtnText}>Gerenciar</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[
                                s.footerBtn,
                                { backgroundColor: isFull || joining ? '#D1D5DB' : '#FF8C42' },
                            ]}
                            onPress={isParticipant ? handleLeave : handleJoin}
                            disabled={joining || (isFull && !isParticipant)}
                            activeOpacity={0.8}
                        >
                            {joining ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={[s.footerBtnText, isFull && !isParticipant && { color: '#6B7280' }]}>
                                    {isParticipant
                                        ? (participationStatus === 'PENDING' ? 'Solicitação enviada' : 'Cancelar')
                                        : (isFull ? 'Esgotado' : 'Pedir para participar')
                                    }
                                </Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
}

// ============================================================================
// Styles
// ============================================================================

const s = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollView: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },

    // ─── Hero ────────────────────────────────────────────
    heroContainer: {
        position: 'relative',
        height: 360,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        overflow: 'hidden',
    },
    dotsContainer: {
        position: 'absolute',
        bottom: 24,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    dot: {
        height: 8,
        borderRadius: 4,
    },
    dotActive: {
        width: 24,
        backgroundColor: '#FFFFFF',
    },
    dotInactive: {
        width: 8,
        backgroundColor: 'rgba(255,255,255,0.5)',
    },
    headerActions: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    headerBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },

    // ─── Content ─────────────────────────────────────────
    content: {
        paddingHorizontal: 24,
        paddingTop: 24,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: '#2D3436',
        marginBottom: 20,
        lineHeight: 32,
    },

    // ─── Host mini ───────────────────────────────────────
    hostRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 24,
    },
    hostAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: 2,
        borderColor: '#FF8C42',
    },
    hostNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    hostName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#2D3436',
    },
    hostLocation: {
        fontSize: 13,
        color: '#9CA3AF',
        marginTop: 2,
    },

    // ─── Quick Info 2×2 Grid ────────────────────────────
    quickInfoGrid: {
        gap: 12,
        marginBottom: 32,
    },
    quickInfoGridRow: {
        flexDirection: 'row',
        gap: 12,
    },
    quickInfoCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingVertical: 20,
        paddingHorizontal: 12,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 110,
    },
    quickInfoAvatarsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
    },
    quickInfoAvatarSmall: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#FF8C42',
    },
    quickInfoAvatarPlaceholder: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#D1D5DB',
        marginLeft: -8,
    },
    quickInfoValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#2D3436',
        marginBottom: 4,
        textAlign: 'center',
    },
    quickInfoSubRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    quickInfoSub: {
        fontSize: 11,
        color: '#9CA3AF',
        textAlign: 'center',
    },
    priceValue: {
        fontSize: 24,
        fontWeight: '800',
        color: '#2D3436',
        marginBottom: 4,
    },
    priceSub: {
        fontSize: 12,
        color: '#9CA3AF',
    },

    // ─── Section ─────────────────────────────────────────
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#2D3436',
        marginBottom: 16,
    },
    bodyText: {
        fontSize: 15,
        color: '#6B7280',
        lineHeight: 24,
    },

    // ─── Cardápio timeline ───────────────────────────────
    timeline: {
        borderLeftWidth: 2,
        borderLeftColor: '#E5E7EB',
        marginLeft: 6,
        paddingLeft: 24,
        gap: 24,
        paddingVertical: 4,
    },
    timelineItem: {
        position: 'relative',
    },
    timelineDot: {
        position: 'absolute',
        left: -31,
        top: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#FF8C42',
    },
    timelineLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#9CA3AF',
        letterSpacing: 1,
        marginBottom: 6,
    },
    timelineDishName: {
        fontSize: 17,
        fontWeight: '700',
        color: '#2D3436',
        marginBottom: 4,
    },
    timelineDishDesc: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 22,
    },

    // ─── Dietary ─────────────────────────────────────────
    dietaryInfo: {
        marginTop: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        gap: 12,
    },
    dietaryRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    dietaryText: {
        flex: 1,
        fontSize: 15,
        color: '#374151',
    },

    // ─── Host Card ───────────────────────────────────────
    hostCard: {
        backgroundColor: '#FFF5F0',
        borderRadius: 24,
        padding: 24,
    },
    hostCardHeader: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
    },
    hostCardAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    hostCardTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    hostCardGreeting: {
        fontSize: 14,
        color: '#9CA3AF',
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    ratingText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#2D3436',
    },
    hostCardName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#2D3436',
        marginBottom: 8,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FF8C42',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    verifiedText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },

    // ─── Stats ───────────────────────────────────────────
    statsList: {
        gap: 16,
        marginBottom: 24,
        paddingTop: 8,
    },
    statRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    statText: {
        fontSize: 15,
        color: '#374151',
    },
    hostBio: {
        fontSize: 15,
        color: '#6B7280',
        lineHeight: 24,
        marginBottom: 24,
    },

    // ─── Reviews ─────────────────────────────────────────
    reviewsTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#2D3436',
        marginBottom: 16,
    },
    reviewCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E8E0DB',
        padding: 20,
        borderRadius: 16,
    },
    starsRow: {
        flexDirection: 'row',
        gap: 4,
        marginBottom: 12,
    },
    reviewText: {
        fontSize: 15,
        color: '#6B7280',
        lineHeight: 24,
        marginBottom: 12,
    },
    reviewAuthor: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2D3436',
        fontStyle: 'italic',
    },
    loadMoreBtn: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    loadMoreText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FF8C42',
    },

    // ─── Map / Location ──────────────────────────────────
    mapContainer: {
        height: 192,
        backgroundColor: '#F3F4F6',
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 16,
        position: 'relative',
    },
    mapImage: {
        width: '100%',
        height: '100%',
    },
    mapPinContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mapPin: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FF8C42',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    locationLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 20,
    },
    locationLabel: {
        fontSize: 15,
        fontWeight: '500',
        color: '#6B7280',
        fontStyle: 'italic',
    },
    amenityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    amenityText: {
        fontSize: 15,
        color: '#374151',
    },

    // ─── Footer ──────────────────────────────────────────
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingHorizontal: 24,
        paddingTop: 16,
    },
    footerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
    },
    footerPrice: {
        fontSize: 22,
        fontWeight: '800',
        color: '#2D3436',
    },
    footerPriceSub: {
        fontSize: 13,
        color: '#9CA3AF',
    },
    footerBtn: {
        flex: 1,
        height: 52,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 16,
    },
});
