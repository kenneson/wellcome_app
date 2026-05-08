import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Dimensions } from '@/shared/constants/theme';
import { supabase } from '@/shared/lib/supabase';
import { userService } from '@/services/api/UserService';
import { Ionicons } from '@expo/vector-icons';
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

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });
    }, []);

    const { data: profile, isLoading, refetch } = useQuery({
        queryKey: ['profile', session?.user?.id],
        queryFn: async () => {
            try {
                const result = await userService.getProfile(session!.user!.id);
                return result;
            } catch (e) {
                if (__DEV__) console.log('Backend failed, falling back to Supabase:', e);
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session!.user!.id)
                    .single();

                if (error) throw error;

                return {
                    id: data.id,
                    fullName: data.full_name,
                    username: data.username,
                    avatarUrl: data.avatar_url,
                    bio: data.bio,
                    occupation: data.occupation,
                    lookingFor: data.looking_for,
                    city: data.city,
                    neighborhood: data.neighborhood,
                    languages: data.languages || [],
                    dietaryRestrictions: data.dietary_restrictions || [],
                    events: [],
                    bookings: [],
                    walletBalance: data.wallet_balance ?? 0,
                    pixKey: data.pix_key ?? null,
                    pixKeyType: data.pix_key_type ?? null,
                };
            }
        },
        enabled: !!session?.user?.id,
    });

    useFocusEffect(
        useCallback(() => {
            if (session?.user?.id) {
                refetch();
            }
        }, [refetch, session?.user?.id])
    );

    async function handleSignOut() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) Alert.alert('Erro ao sair', error.message);
        } catch (error) {
            Alert.alert('Erro', 'Ocorreu um erro inesperado.');
        }
    }

    if (!session || isLoading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={Colors.light.primary} />
                <Text style={{ marginTop: 10, color: '#666' }}>Carregando perfil...</Text>
            </View>
        );
    }

    const stats = {
        offered: profile?.events?.length || 0,
        participated: profile?.bookings?.filter((b: any) => {
            if (!b.event?.eventDate) return false;
            return new Date(b.event.eventDate).getTime() < new Date().getTime();
        }).length || 0,
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Meu Perfil</Text>
                <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Notificações"
                    onPress={() => router.push('/notifications')}
                >
                    <Ionicons name="notifications-outline" size={Dimensions.icon.large} color={Colors.light.text} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                        {profile?.avatarUrl ? (
                            <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <IconSymbol name="person.fill" size={40} color="#fff" />
                            </View>
                        )}
                        <TouchableOpacity style={styles.editIcon} onPress={() => router.push('/profile/edit')}>
                            <Ionicons name="pencil" size={14} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{profile?.fullName || 'Usuário'}</Text>
                        <Ionicons name="checkmark-circle" size={20} color={Colors.light.primary} />
                    </View>

                    {profile?.city && (
                        <View style={styles.locationRow}>
                            <Ionicons name="location-outline" size={14} color="#999" />
                            <Text style={styles.locationText}>
                                {profile.neighborhood ? `${profile.neighborhood}, ` : ''}{profile.city}
                            </Text>
                        </View>
                    )}

                    <Text style={styles.bio}>{profile?.bio || 'Sem biografia.'}</Text>

                    <TouchableOpacity style={styles.editButton} onPress={() => router.push('/profile/edit')}>
                        <Ionicons name="create-outline" size={16} color="#333" style={{ marginRight: 6 }} />
                        <Text style={styles.editButtonText}>Editar Perfil</Text>
                    </TouchableOpacity>
                </View>

                {/* Mini Stats */}
                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Text style={styles.statNumber}>{stats.offered}</Text>
                        <Text style={styles.statLabel}>Eventos{'\n'}oferecidos</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statNumber}>{stats.participated}</Text>
                        <Text style={styles.statLabel}>Participações{'\n'}passadas</Text>
                    </View>
                </View>

                {/* Settings Section */}
                <Text style={styles.sectionTitle}>CONFIGURAÇÕES</Text>

                <View style={styles.menuGroup}>
                    <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/pix-key')}>
                        <View style={[styles.menuIconCircle, { backgroundColor: '#FFF3E0' }]}>
                            <Ionicons name="card-outline" size={20} color={Colors.light.primary} />
                        </View>
                        <Text style={styles.menuText}>Minha Chave PIX</Text>
                        <Ionicons name="chevron-forward" size={18} color="#ccc" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/notifications')}>
                        <View style={[styles.menuIconCircle, { backgroundColor: '#E3F2FD' }]}>
                            <Ionicons name="notifications-outline" size={20} color="#2196F3" />
                        </View>
                        <Text style={styles.menuText}>Notificações</Text>
                        <Ionicons name="chevron-forward" size={18} color="#ccc" />
                    </TouchableOpacity>
                </View>

                {/* Danger Zone */}
                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>CONTA</Text>

                <View style={styles.menuGroup}>
                    <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile/delete-account')}>
                        <View style={[styles.menuIconCircle, { backgroundColor: '#FFF1F0' }]}>
                            <Ionicons name="trash-outline" size={20} color={Colors.light.error} />
                        </View>
                        <Text style={[styles.menuText, { color: Colors.light.error }]}>Excluir conta</Text>
                        <Ionicons name="chevron-forward" size={18} color={Colors.light.error} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
                    <Ionicons name="log-out-outline" size={20} color={Colors.light.error} />
                    <Text style={styles.logoutText}>Sair da conta</Text>
                </TouchableOpacity>

                {__DEV__ && (
                    <TouchableOpacity
                        style={styles.devButton}
                        onPress={async () => {
                            const { data: { session } } = await supabase.auth.getSession();
                            if (!session) return;
                            const { data: p } = await supabase
                                .from('profiles')
                                .select('expo_push_token')
                                .eq('id', session.user.id)
                                .single();
                            if (!p?.expo_push_token) {
                                Alert.alert('Erro', 'Token não encontrado');
                                return;
                            }
                            const response = await fetch(`${require('@/shared/config/api').API_URL}/notifications/test`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${session.access_token}`,
                                },
                                body: JSON.stringify({
                                    token: p.expo_push_token,
                                    title: 'Olá!',
                                    body: 'Notificação de teste.',
                                    data: { test: true },
                                }),
                            });
                            Alert.alert(response.ok ? 'Sucesso' : 'Erro', response.ok ? 'Enviada!' : 'Falhou');
                        }}
                    >
                        <Text style={styles.devButtonText}>🔔 Testar Push</Text>
                    </TouchableOpacity>
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
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1A1A1A',
    },
    content: {
        paddingHorizontal: 24,
    },
    // ── Profile Card ──
    profileCard: {
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 24,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatarImage: {
        width: 90,
        height: 90,
        borderRadius: 45,
    },
    avatarPlaceholder: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: Colors.light.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    editIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: Colors.light.primary,
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    name: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1A1A1A',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 10,
    },
    locationText: {
        fontSize: 13,
        color: '#999',
    },
    bio: {
        textAlign: 'center',
        color: '#666',
        marginBottom: 16,
        paddingHorizontal: 12,
        fontSize: 14,
        lineHeight: 20,
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 20,
        backgroundColor: '#fff',
    },
    editButtonText: {
        fontWeight: '600',
        color: '#333',
        fontSize: 14,
    },
    // ── Stats ──
    statsRow: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        backgroundColor: '#F0F0F0',
        marginHorizontal: 16,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.light.primary,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 11,
        color: '#666',
        textAlign: 'center',
        fontWeight: '500',
        lineHeight: 16,
    },
    // ── Settings ──
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#999',
        marginBottom: 12,
        letterSpacing: 1,
    },
    menuGroup: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    menuIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    menuText: {
        flex: 1,
        fontSize: 15,
        color: '#333',
        fontWeight: '500',
    },
    // ── Logout ──
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 14,
        marginTop: 24,
        gap: 8,
        borderWidth: 1,
        borderColor: '#FFE5E5',
    },
    logoutText: {
        color: Colors.light.error,
        fontWeight: '600',
        fontSize: 15,
    },
    // ── Dev ──
    devButton: {
        marginTop: 16,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
    },
    devButtonText: {
        color: '#666',
        fontSize: 13,
        fontWeight: '500',
    },
});
