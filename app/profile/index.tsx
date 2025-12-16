import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Alert,
    ScrollView,
    ActivityIndicator,
    useColorScheme
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function ProfileScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [stats, setStats] = useState({ offered: 0, participated: 0, averageRating: 0 }); // Mock stats for now

    // Reload profile when screen comes into focus (e.g. back from edit)
    useFocusEffect(
        useCallback(() => {
            getProfile();
        }, [])
    );

    async function getProfile() {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.replace('/auth/login');
                return;
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is no rows found
                console.error(error);
            }

            if (data) {
                setProfile({
                    ...data,
                    email: session.user.email
                });
                // Mock stats
                setStats({
                    offered: 12,
                    participated: 5,
                    averageRating: 4.9
                });
            }
        } catch (error: any) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSignOut() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) Alert.alert('Erro ao sair', error.message);
        } catch (error) {
            Alert.alert('Erro', 'Ocorreu um erro inesperado.');
        }
    }

    if (loading && !profile) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#FF8C42" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Meu Perfil</Text>
                <TouchableOpacity>
                    <Ionicons name="settings-outline" size={24} color="#333" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Profile Info */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        {profile?.avatar_url ? (
                            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
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
                        <Text style={styles.name}>{profile?.full_name || 'Usuário'}</Text>
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
                        <Text style={styles.statLabel}>JANTARES{'\n'}PARTICIPADOS</Text>
                    </View>
                </View>

                {/* Rating */}
                <View style={styles.ratingCard}>
                    <Text style={styles.ratingNumber}>{stats.averageRating} <Ionicons name="star" size={20} color="#FFA500" /></Text>
                    <Text style={styles.ratingLabel}>AVALIAÇÃO MÉDIA</Text>
                </View>

                {/* Tabs - Mock Visual Only */}
                <View style={styles.tabsContainer}>
                    <TouchableOpacity style={[styles.tab, styles.activeTab]}>
                        <Text style={[styles.tabText, styles.activeTabText]}>Histórico</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tab}>
                        <Text style={styles.tabText}>Preferências</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>ÚLTIMAS EXPERIÊNCIAS</Text>

                {/* Mock Experience Card */}
                <View style={styles.experienceCard}>
                    <View style={styles.expImagePlaceholder} />
                    <View style={styles.expInfo}>
                        <Text style={styles.expTitle}>Noite de Risoto</Text>
                        <Text style={styles.expSubtitle}>Anfitrião: João B. • 14 Out</Text>
                        <View style={styles.expStatus}>
                            <Ionicons name="checkmark-circle" size={14} color="#FF8C42" />
                            <Text style={styles.expStatusText}>Concluído</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.rateButton}>
                        <Text style={styles.rateButtonText}>Avaliar</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>CONFIGURAÇÕES</Text>

                <TouchableOpacity style={styles.menuItem}>
                    <View style={styles.menuIconCircle}>
                        <Ionicons name="card-outline" size={20} color="#FF8C42" />
                    </View>
                    <Text style={styles.menuText}>Métodos de Pagamento</Text>
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                    <View style={[styles.menuIconCircle, { backgroundColor: '#E3F2FD' }]}>
                        <Ionicons name="notifications-outline" size={20} color="#2196F3" />
                    </View>
                    <Text style={styles.menuText}>Notificações</Text>
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                    <View style={[styles.menuIconCircle, { backgroundColor: '#F3E5F5' }]}>
                        <Ionicons name="help-circle-outline" size={20} color="#9C27B0" />
                    </View>
                    <Text style={styles.menuText}>Ajuda e Suporte</Text>
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.menuItem, { marginTop: 20 }]} onPress={handleSignOut}>
                    <Text style={[styles.menuText, { color: '#FF3B30' }]}>Sair da conta</Text>
                    <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>

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
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    menuIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFF3E0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    menuText: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
});
