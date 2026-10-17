import { Event, RegistrationStatus } from '@/entities/event/types';
import { eventService } from '@/services/api/EventService';
import { DEFAULT_PLACEHOLDER_IMAGE } from '@/shared/lib/styles';
import { supabase } from '@/shared/lib/supabase';
import { getOptimizedImageUrl } from '@/utils/imageOptimizer';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import { BrandSheet, BrandStackHeader } from '@/components/ui/wellcome';
import { BorderRadius, Palette, Spacing } from '@/shared/constants/theme';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Dynamic import to avoid crashing if react-native-qrcode-svg has issues
let QRCode: any = null;
try {
    QRCode = require('react-native-qrcode-svg').default || require('react-native-qrcode-svg');
} catch {
    // QR code library not available
}

export default function TicketScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [event, setEvent] = useState<Event | null>(null);
    const [booking, setBooking] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/immutability -- function declaration is hoisted
        fetchTicketData();
    }, [id]);

    async function fetchTicketData() {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const eventData = await eventService.getEventById(id as string);
            setEvent(eventData);

            const myBooking = eventData.bookings?.find(
                (b) => b.userId === session.user.id
            );

            if (!myBooking || myBooking.status !== RegistrationStatus.APPROVED) {
                Alert.alert('Erro', 'Você não possui um ingresso aprovado para este evento.');
                router.back();
                return;
            }

            setBooking(myBooking);
        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Não foi possível carregar o ingresso.');
            router.back();
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <View style={styles.container}>
                <BrandStackHeader eyebrow="SEU INGRESSO" title="Meu ingresso" backIcon="close" />
                <BrandSheet>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={Palette.orange} />
                        <Text style={styles.loadingText}>Carregando ingresso...</Text>
                    </View>
                </BrandSheet>
            </View>
        );
    }

    if (!event || !booking) return null;

    const qrData = JSON.stringify({
        bookingId: booking.id,
        eventId: event.id,
    });

    const eventDate = new Date(event.eventDate);
    const dayNumber = eventDate.getDate();
    const monthShort = eventDate.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    const timeStr = eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return (
        <View style={styles.container}>
            <BrandStackHeader eyebrow="SEU INGRESSO" title="Meu ingresso" backIcon="close" />

            <BrandSheet>
                <ScrollView
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xxxl }]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Ticket Card */}
                    <View style={styles.ticketCard}>
                        {/* Event Cover */}
                        <Image
                            source={{ uri: getOptimizedImageUrl(event.coverImageUrl || DEFAULT_PLACEHOLDER_IMAGE, { width: 400 }) }}
                            style={styles.coverImage}
                            contentFit="cover"
                        />

                        {/* Event Info */}
                        <View style={styles.eventInfo}>
                            <Text style={styles.eventTitle}>{event.title}</Text>

                            <View style={styles.infoRow}>
                                <View style={styles.dateBlock}>
                                    <Text style={styles.dayNumber}>{dayNumber}</Text>
                                    <Text style={styles.monthText}>{monthShort.toUpperCase()}</Text>
                                </View>
                                <View style={styles.infoDetails}>
                                    <View style={styles.infoItem}>
                                        <Ionicons name="time-outline" size={16} color={Palette.muted} />
                                        <Text style={styles.infoText}>{timeStr}</Text>
                                    </View>
                                    <View style={styles.infoItem}>
                                        <Ionicons name="location-outline" size={16} color={Palette.muted} />
                                        <Text style={styles.infoText} numberOfLines={1}>{event.location}</Text>
                                    </View>
                                    {event.host && (
                                        <View style={styles.infoItem}>
                                            <Ionicons name="person-outline" size={16} color={Palette.muted} />
                                            <Text style={styles.infoText}>Anfitrião: {event.host.fullName}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </View>

                        {/* Dashed separator */}
                        <View style={styles.separator}>
                            <View style={styles.separatorCircleLeft} />
                            <View style={styles.dashedLine} />
                            <View style={styles.separatorCircleRight} />
                        </View>

                        {/* QR Code Section */}
                        <View style={styles.qrSection}>
                            <Text style={styles.qrLabel}>APRESENTE ESTE QR CODE AO ANFITRIÃO</Text>
                            <View style={styles.qrContainer}>
                                {QRCode ? (
                                    <QRCode
                                        value={qrData}
                                        size={200}
                                        color={Palette.ink}
                                        backgroundColor={Palette.surface}
                                    />
                                ) : (
                                    <View style={styles.qrFallback}>
                                        <Ionicons name="qr-code-outline" size={64} color={Palette.subtle} />
                                        <Text style={styles.qrFallbackText}>QR Code indisponível</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.bookingId}>#{booking.id.slice(0, 8).toUpperCase()}</Text>
                        </View>

                        {/* Status */}
                        <View style={styles.statusBar}>
                            <Ionicons name="checkmark-circle" size={18} color={Palette.green} />
                            <Text style={styles.statusText}>INSCRIÇÃO APROVADA</Text>
                        </View>
                    </View>

                    {/* Info Note */}
                    <View style={styles.noteCard}>
                        <Ionicons name="information-circle-outline" size={20} color={Palette.orangeDeep} />
                        <Text style={styles.noteText}>
                            No dia do evento, apresente este QR Code ao anfitrião para confirmar sua presença.
                        </Text>
                    </View>
                </ScrollView>
            </BrandSheet>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Palette.paper,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: Spacing.md,
        color: Palette.inkSoft,
        fontSize: 14,
    },
    scrollContent: {
        padding: Spacing.xl,
    },
    ticketCard: {
        backgroundColor: Palette.surface,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        overflow: 'hidden',
    },
    coverImage: {
        width: '100%',
        height: 160,
        backgroundColor: Palette.track,
    },
    eventInfo: {
        padding: Spacing.xl,
    },
    eventTitle: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.3,
        color: Palette.ink,
        marginBottom: Spacing.lg,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    dateBlock: {
        backgroundColor: Palette.orangeSoft,
        borderRadius: BorderRadius.lg,
        width: 56,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.lg,
    },
    dayNumber: {
        fontSize: 22,
        fontWeight: '800',
        color: Palette.orangeDeep,
        lineHeight: 26,
    },
    monthText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.6,
        color: Palette.orangeDeep,
        textTransform: 'uppercase',
    },
    infoDetails: {
        flex: 1,
        gap: 6,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    infoText: {
        fontSize: 14,
        color: Palette.inkSoft,
        flex: 1,
    },
    separator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: -1,
    },
    separatorCircleLeft: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: Palette.paper,
        marginLeft: -12,
    },
    dashedLine: {
        flex: 1,
        height: 1,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: Palette.line,
    },
    separatorCircleRight: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: Palette.paper,
        marginRight: -12,
    },
    qrSection: {
        alignItems: 'center',
        paddingVertical: Spacing.xxl,
        paddingHorizontal: Spacing.xl,
    },
    qrLabel: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
        color: Palette.muted,
        marginBottom: Spacing.lg,
        textAlign: 'center',
    },
    qrContainer: {
        padding: Spacing.lg,
        backgroundColor: Palette.surface,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Palette.line,
    },
    qrFallback: {
        width: 200,
        height: 200,
        backgroundColor: Palette.track,
        borderRadius: BorderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    qrFallbackText: {
        color: Palette.inkSoft,
        marginTop: Spacing.sm,
        fontSize: 12,
    },
    bookingId: {
        marginTop: Spacing.lg,
        fontSize: 13,
        fontWeight: '800',
        color: Palette.muted,
        letterSpacing: 2,
    },
    statusBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: Palette.greenSoft,
        paddingVertical: Spacing.md,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.6,
        color: Palette.green,
    },
    noteCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: Palette.orangeSoft,
        padding: Spacing.lg,
        borderRadius: 22,
        marginTop: Spacing.lg,
    },
    noteText: {
        flex: 1,
        fontSize: 14,
        color: Palette.inkSoft,
        lineHeight: 21,
    },
});
