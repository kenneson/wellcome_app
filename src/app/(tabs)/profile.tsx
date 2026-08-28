import { IconSymbol } from '@/components/ui/icon-symbol';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { registrationService } from '@/services/api/RegistrationService';
import { userService } from '@/services/api/UserService';
import { Colors, Dimensions } from '@/shared/constants/theme';
import { supabase } from '@/shared/lib/supabase';
import { formatFirstName, formatShortDate } from '@/utils/formatters';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
    const router = useRouter();
    const [session, setSession] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'history' | 'upcoming'>('history');
    // ... existing useState
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });
    }, []);

    const { data: profile, isLoading, refetch } = useQuery({
        queryKey: ['profile', session?.user?.id],
        queryFn: () => userService.getProfile(session!.user!.id),
        enabled: !!session?.user?.id,
    });

    useFocusEffect(
        useCallback(() => {
            if (session?.user?.id) {
                refetch();
            }
        }, [refetch, session?.user?.id])
    );

    async function handleCancelBooking(eventId: string) {
        if (processing) return;
        Alert.alert(
            'Cancelar Solicitação',
            'Tem certeza que deseja cancelar sua solicitação de inscrição?',
            [
                { text: 'Não', style: 'cancel' },
                {
                    text: 'Sim, cancelar',
                    style: 'destructive',
                    onPress: async () => {
                        setProcessing(true);
                        try {
                            await registrationService.cancelBooking(eventId, session.user.id);
                            refetch(); // Refresh list
                            Alert.alert('Sucesso', 'Solicitação cancelada.');
                        } catch {
                            Alert.alert('Erro', 'Não foi possível cancelar.');
                        } finally {
                            setProcessing(false);
                        }
                    }
                }
            ]
        );
    }

    // Show loading if session is not yet loaded or query is loading
    if (!session || isLoading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#FF8C42" />
                <Text style={{ marginTop: 10, color: '#666' }}>Carregando perfil...</Text>
            </View>
        );
    }

    const now = new Date();

    const pastBookings = profile?.bookings?.filter((b: any) => {
        if (!b.event?.eventDate) return false;
        return new Date(b.event.eventDate).getTime() < now.getTime();
    }) || [];

    const upcomingBookings = profile?.bookings?.filter((b: any) => {
        if (!b.event?.eventDate) return false;
        return new Date(b.event.eventDate).getTime() >= now.getTime();
    }) || [];

    const stats = {
        offered: profile?.events?.length || 0,
        participated: pastBookings.length,
        averageRating: 5.0 // Placeholder
    };

    const hasBookings = activeTab === 'history' ? pastBookings.length > 0 : upcomingBookings.length > 0;
    const currentBookings = activeTab === 'history' ? pastBookings : upcomingBookings;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Meu Perfil</Text>
                <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Notificações"
                        accessibilityHint="Abrir notificações"
                        onPress={() => router.push('/notifications')}
                        style={[styles.headerAction, styles.notificationAction]}
                    >
                        <Ionicons name="notifications-outline" size={Dimensions.icon.large} color={Colors.light.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Configurações"
                        accessibilityHint="Abrir configurações do perfil"
                        onPress={() => router.push('/profile/settings' as any)}
                        style={styles.headerAction}
                    >
                        <Ionicons name="settings-outline" size={Dimensions.icon.large} color={Colors.light.text} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Profile Info */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        {profile?.avatarUrl ? (
                            <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <IconSymbol name="person.fill" size={40} color="#fff" />
                            </View>
                        )}
                        <TouchableOpacity style={styles.editIcon} onPress={() => router.push('/profile/edit')}>
                            <Ionicons name="pencil" size={16} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{profile?.fullName || 'Usuário'}</Text>
                        <Ionicons name="checkmark-circle" size={20} color="#FF8C42" />
                    </View>

                    <Text style={styles.bio}>
                        {profile?.bio || 'Sem biografia.'}
                    </Text>

                    <TouchableOpacity style={styles.editButton} onPress={() => router.push('/profile/edit')}>
                        <Text style={styles.editButtonText}>Editar Perfil</Text>
                    </TouchableOpacity>
                </View>

                {/* Stats */}
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{stats.offered}</Text>
                        <Text style={styles.statLabel}>JANTARES{'\n'}OFERECIDOS</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{stats.participated}</Text>
                        <Text style={styles.statLabel}>PARTICIPAÇÕES{'\n'}PASSADAS</Text>
                    </View>
                </View>

                {/* Rating */}
                <View style={styles.ratingCard}>
                    <Text style={styles.ratingNumber}>{stats.averageRating} <Ionicons name="star" size={20} color="#FFA500" /></Text>
                    <Text style={styles.ratingLabel}>AVALIAÇÃO MÉDIA</Text>
                </View>

                {/* Tabs */}
                <View style={styles.tabsContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'history' && styles.activeTab]}
                        onPress={() => setActiveTab('history')}
                    >
                        <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>Histórico</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
                        onPress={() => setActiveTab('upcoming')}
                    >
                        <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>Agendados</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.manageEventsCard} onPress={() => router.push('/host-events' as any)}>
                    <View style={styles.manageIconContainer}>
                        <Ionicons name="calendar" size={24} color="#FF8C42" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.manageTitle}>Central de Eventos</Text>
                        <Text style={styles.manageSubtitle}>Inscrições, ocupação, rascunhos e edição</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>

                {/* Wallet Card */}
                <TouchableOpacity style={styles.walletCard} onPress={() => router.push('/profile/wallet')}>
                    <View style={styles.walletIconContainer}>
                        <Ionicons name="wallet-outline" size={24} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.walletTitle}>Minha Carteira</Text>
                        <Text style={styles.walletBalance}>
                            R$ {Number(profile?.walletBalance ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </Text>
                    </View>
                    <View style={styles.walletChevron}>
                        <Ionicons name="chevron-forward" size={20} color="#fff" />
                    </View>
                </TouchableOpacity>

                <Text style={styles.sectionTitle}>
                    {activeTab === 'history' ? 'ÚLTIMAS EXPERIÊNCIAS' : 'PRÓXIMOS EVENTOS'}
                </Text>

                {/* Events List */}
                {hasBookings ? (
                    currentBookings.map((booking: any) => (
                        <TouchableOpacity
                            key={booking.id}
                            style={styles.experienceCard}
                            onPress={() => router.push(`/events/${booking.event?.id}`)}
                            activeOpacity={0.7}
                        >
                            <Image
                                source={{ uri: booking.event?.coverImageUrl }}
                                style={styles.expImagePlaceholder}
                                contentFit="cover"
                            />
                             <View style={styles.expInfo}>
                                <Text style={styles.expTitle}>{booking.event?.title || 'Evento'}</Text>
                                <Text style={styles.expSubtitle}>
                                    Anfitrião: {formatFirstName(booking.event?.host?.fullName)} • {formatShortDate(booking.event?.eventDate)}
                                </Text>
                                <View style={{ marginTop: 4 }}>
                                    <StatusBadge status={booking.status} />
                                </View>
                            </View>
                            {activeTab === 'upcoming' && booking.status === 'APPROVED' && (
                                <TouchableOpacity
                                    style={styles.ticketButton}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        router.push(`/events/${booking.event?.id}/ticket`);
                                    }}
                                >
                                    <Ionicons name="qr-code-outline" size={16} color="#FF8C42" />
                                    <Text style={styles.ticketButtonText}>Ingresso</Text>
                                </TouchableOpacity>
                            )}
                            {activeTab === 'history' && (
                                <TouchableOpacity style={styles.rateButton}>
                                    <Text style={styles.rateButtonText}>Avaliar</Text>
                                </TouchableOpacity>
                            )}
                            {activeTab === 'upcoming' && booking.status === 'pending' && (
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        handleCancelBooking(booking.event?.id);
                                    }}
                                >
                                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                                </TouchableOpacity>
                            )}
                        </TouchableOpacity>
                    ))
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>
                            {activeTab === 'history'
                                ? 'Nenhuma experiência recente.'
                                : 'Nenhum evento agendado.'}
                        </Text>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9F9F9',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
    },
    headerAction: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    notificationAction: { marginRight: 4 },
    content: {
        paddingHorizontal: 24,
    },
    profileSection: {
        alignItems: 'center',
        marginVertical: 20,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatarImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#FF8C42',
        justifyContent: 'center',
        alignItems: 'center',
    },
    editIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#FF8C42',
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000',
    },
    bio: {
        textAlign: 'center',
        color: '#666',
        marginBottom: 20,
        paddingHorizontal: 20,
    },
    editButton: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        paddingVertical: 8,
        paddingHorizontal: 24,
        borderRadius: 20,
        backgroundColor: '#fff',
    },
    editButtonText: {
        fontWeight: '600',
        color: '#333',
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FF8C42',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 10,
        color: '#666',
        textAlign: 'center',
        fontWeight: '600',
    },
    ratingCard: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    ratingNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FF8C42',
        marginBottom: 4,
    },
    ratingLabel: {
        fontSize: 10,
        color: '#666',
        textAlign: 'center',
        fontWeight: '600',
    },
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: '#E0E0E0', // Or a lighter gray for the track
        borderRadius: 24,
        padding: 4,
        marginBottom: 24,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 20,
    },
    activeTab: {
        backgroundColor: '#fff',
    },
    tabText: {
        fontWeight: '600',
        color: '#666',
    },
    activeTabText: {
        color: '#FF8C42',
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#888',
        marginBottom: 16,
        marginTop: 8,
        letterSpacing: 1,
    },
    experienceCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 24,
    },
    expImagePlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#ccc',
        marginRight: 12,
    },
    expInfo: {
        flex: 1,
    },
    expTitle: {
        fontWeight: 'bold',
        fontSize: 16,
        color: '#333',
    },
    expSubtitle: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    expStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    expStatusText: {
        fontSize: 12,
        color: '#FF8C42',
        fontWeight: '500',
    },
    rateButton: {
        backgroundColor: '#FFF3E0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    rateButtonText: {
        color: '#FF8C42',
        fontWeight: '600',
        fontSize: 12,
    },
    manageEventsCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    manageIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFF3E0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    manageTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    manageSubtitle: {
        fontSize: 12,
        color: '#666',
    },
    walletCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF8C42',
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
        shadowColor: '#FF8C42',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 5,
    },
    walletIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    walletTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.85)',
        marginBottom: 2,
    },
    walletBalance: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
    },
    walletChevron: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 24,
    },
    emptyStateText: {
        color: '#999',
        fontSize: 14,
    },
    cancelButton: {
        backgroundColor: '#FFF5F5',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FF3B30',
        marginLeft: 8,
    },
    cancelButtonText: {
        color: '#FF3B30',
        fontSize: 12,
        fontWeight: '600',
    },
    ticketButton: {
        backgroundColor: '#FFF3E0',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginLeft: 8,
    },
    ticketButtonText: {
        color: '#FF8C42',
        fontSize: 12,
        fontWeight: '600',
    },
});
