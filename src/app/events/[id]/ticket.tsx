import { Event, RegistrationStatus } from '@/entities/event/types';
import { eventService } from '@/services/api/EventService';
import { DEFAULT_PLACEHOLDER_IMAGE } from '@/shared/lib/styles';
import { supabase } from '@/shared/lib/supabase';
import { getOptimizedImageUrl } from '@/utils/imageOptimizer';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    const [event, setEvent] = useState<Event | null>(null);
    const [booking, setBooking] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
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
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF8C42" />
                <Text style={styles.loadingText}>Carregando ingresso...</Text>
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
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Meu Ingresso</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
                                    <Ionicons name="time-outline" size={16} color="#666" />
                                    <Text style={styles.infoText}>{timeStr}</Text>
                                </View>
                                <View style={styles.infoItem}>
                                    <Ionicons name="location-outline" size={16} color="#666" />
                                    <Text style={styles.infoText} numberOfLines={1}>{event.location}</Text>
                                </View>
                                {event.host && (
                                    <View style={styles.infoItem}>
                                        <Ionicons name="person-outline" size={16} color="#666" />
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
                        <Text style={styles.qrLabel}>Apresente este QR Code ao anfitrião</Text>
                        <View style={styles.qrContainer}>
                            {QRCode ? (
                                <QRCode
                                    value={qrData}
                                    size={200}
                                    color="#1A1A1A"
                                    backgroundColor="#FFFFFF"
                                />
                            ) : (
                                <View style={{ width: 200, height: 200, backgroundColor: '#F3F4F6', borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}>
                                    <Ionicons name="qr-code-outline" size={64} color="#9CA3AF" />
                                    <Text style={{ color: '#6B7280', marginTop: 8, fontSize: 12 }}>QR Code indisponível</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.bookingId}>#{booking.id.slice(0, 8).toUpperCase()}</Text>
                    </View>

                    {/* Status */}
                    <View style={styles.statusBar}>
                        <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                        <Text style={styles.statusText}>Inscrição Aprovada</Text>
                    </View>
                </View>

                {/* Info Note */}
                <View style={styles.noteCard}>
                    <Ionicons name="information-circle-outline" size={20} color="#FF8C42" />
                    <Text style={styles.noteText}>
                        No dia do evento, apresente este QR Code ao anfitrião para confirmar sua presença.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
    },
    loadingText: {
        marginTop: 12,
        color: '#666',
        fontSize: 14,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    ticketCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    coverImage: {
        width: '100%',
        height: 160,
    },
    eventInfo: {
        padding: 20,
    },
    eventTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    dateBlock: {
        backgroundColor: '#FFF3E0',
        borderRadius: 12,
        width: 56,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    dayNumber: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FF8C42',
        lineHeight: 26,
    },
    monthText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FF8C42',
        textTransform: 'uppercase',
    },
    infoDetails: {
        flex: 1,
        gap: 6,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#555',
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
        backgroundColor: '#F5F5F5',
        marginLeft: -12,
    },
    dashedLine: {
        flex: 1,
        height: 1,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    separatorCircleRight: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#F5F5F5',
        marginRight: -12,
    },
    qrSection: {
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 20,
    },
    qrLabel: {
        fontSize: 13,
        color: '#888',
        marginBottom: 20,
        fontWeight: '500',
    },
    qrContainer: {
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    bookingId: {
        marginTop: 16,
        fontSize: 13,
        fontWeight: '700',
        color: '#AAA',
        letterSpacing: 2,
    },
    statusBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#F0FDF4',
        paddingVertical: 12,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#10B981',
    },
    noteCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: '#FFF8F0',
        padding: 16,
        borderRadius: 12,
        marginTop: 16,
    },
    noteText: {
        flex: 1,
        fontSize: 13,
        color: '#666',
        lineHeight: 19,
    },
});
