import { ReportSheet } from '@/components/ui/ReportSheet';
import { moderationService } from '@/services/api/ModerationService';
import { UserProfile, userService } from '@/services/api/UserService';
import { supabase } from '@/shared/lib/supabase';
import { queryClient } from '@/shared/lib/react-query';
import { DEFAULT_AVATAR_PLACEHOLDER } from '@/shared/lib/styles';
import { getOptimizedImageUrl } from '@/utils/imageOptimizer';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PublicProfileScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isBlocked, setIsBlocked] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);
    const [reportVisible, setReportVisible] = useState(false);

    const profileId = id as string;
    const isOwnProfile = !!currentUserId && currentUserId === profileId;

    useEffect(() => {
        if (id) fetchProfile();
    }, [id]);

    useEffect(() => {
        (async () => {
            const { data } = await supabase.auth.getSession();
            setCurrentUserId(data.session?.user?.id ?? null);
            if (profileId) {
                const blocked = await moderationService.listBlocked();
                setIsBlocked(blocked.includes(profileId));
            }
        })();
    }, [profileId]);

    async function toggleBlock() {
        try {
            if (isBlocked) {
                await moderationService.unblock(profileId);
                setIsBlocked(false);
            } else {
                await moderationService.block(profileId);
                setIsBlocked(true);
            }
            setMenuVisible(false);
            queryClient.invalidateQueries({ queryKey: ['blockedIds'] });
            Alert.alert(
                isBlocked ? 'Usuário desbloqueado' : 'Usuário bloqueado',
                isBlocked ? '' : 'Você não verá mais o conteúdo desse usuário.',
            );
        } catch (error: any) {
            Alert.alert('Erro', error?.message || 'Não foi possível concluir a ação.');
        }
    }

    async function fetchProfile() {
        try {
            setLoading(true);
            const data = await userService.getProfile(id as string);
            setProfile(data);
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#FF8C42" />
            </View>
        );
    }

    if (!profile) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                    </TouchableOpacity>
                </View>
                <View style={styles.center}>
                    <Text style={styles.emptyText}>Perfil não encontrado.</Text>
                </View>
            </SafeAreaView>
        );
    }

    const optimizedAvatar = getOptimizedImageUrl(profile.avatarUrl, { width: 200 });
    const location = [profile.city, profile.neighborhood].filter(Boolean).join(' • ');
    const pastEvents = profile.bookings?.filter((b: any) => b.status === 'APPROVED').length || 0;
    const hostedEvents = profile.events?.length || 0;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Perfil</Text>
                {!isOwnProfile ? (
                    <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.backButton}>
                        <Ionicons name="ellipsis-horizontal" size={24} color="#1A1A1A" />
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 32 }} />
                )}
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Avatar + Name */}
                <View style={styles.profileHeader}>
                    <Image
                        source={{ uri: optimizedAvatar || DEFAULT_AVATAR_PLACEHOLDER }}
                        style={styles.avatar}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                    />
                    <Text style={styles.name}>{profile.fullName || 'Usuário'}</Text>
                    {profile.occupation && (
                        <Text style={styles.occupation}>{profile.occupation}</Text>
                    )}
                    {location ? (
                        <View style={styles.locationRow}>
                            <Ionicons name="location-outline" size={14} color="#9CA3AF" />
                            <Text style={styles.locationText}>{location}</Text>
                        </View>
                    ) : null}
                </View>

                {/* Stats */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{hostedEvents}</Text>
                        <Text style={styles.statLabel}>Eventos{'\n'}criados</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{pastEvents}</Text>
                        <Text style={styles.statLabel}>Participações</Text>
                    </View>
                </View>

                {/* Bio */}
                {profile.bio ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Sobre</Text>
                        <Text style={styles.bioText}>{profile.bio}</Text>
                    </View>
                ) : null}

                {/* What they're looking for */}
                {profile.lookingFor ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>O que busca no Wellcome</Text>
                        <Text style={styles.bioText}>{profile.lookingFor}</Text>
                    </View>
                ) : null}

                {/* Languages */}
                {profile.languages && profile.languages.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Idiomas</Text>
                        <View style={styles.tagsRow}>
                            {profile.languages.map((lang, idx) => (
                                <View key={idx} style={styles.tag}>
                                    <Ionicons name="globe-outline" size={14} color="#FF8C42" />
                                    <Text style={styles.tagText}>{lang}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Dietary Restrictions */}
                {profile.dietaryRestrictions && profile.dietaryRestrictions.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Restrições alimentares</Text>
                        <View style={styles.tagsRow}>
                            {profile.dietaryRestrictions.map((restriction, idx) => (
                                <View key={idx} style={[styles.tag, styles.tagWarning]}>
                                    <Ionicons name="alert-circle-outline" size={14} color="#B45309" />
                                    <Text style={[styles.tagText, styles.tagWarningText]}>{restriction}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Menu de moderação */}
            <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
                <Pressable style={styles.menuBackdrop} onPress={() => setMenuVisible(false)}>
                    <View style={styles.menu}>
                        <TouchableOpacity style={styles.menuItem} onPress={toggleBlock}>
                            <Ionicons name={isBlocked ? 'lock-open-outline' : 'ban-outline'} size={20} color="#1A1A1A" />
                            <Text style={styles.menuText}>{isBlocked ? 'Desbloquear usuário' : 'Bloquear usuário'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => { setMenuVisible(false); setReportVisible(true); }}
                        >
                            <Ionicons name="flag-outline" size={20} color="#DC2626" />
                            <Text style={[styles.menuText, { color: '#DC2626' }]}>Denunciar usuário</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>

            <ReportSheet
                visible={reportVisible}
                onClose={() => setReportVisible(false)}
                targetType="USER"
                targetId={profileId}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    profileHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#F3F4F6',
        marginBottom: 16,
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    occupation: {
        fontSize: 15,
        color: '#6B7280',
        marginBottom: 8,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    locationText: {
        fontSize: 14,
        color: '#9CA3AF',
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        backgroundColor: '#E5E7EB',
    },
    statNumber: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'center',
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 8,
    },
    bioText: {
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 22,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF7ED',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    tagText: {
        fontSize: 13,
        color: '#FF8C42',
        fontWeight: '500',
    },
    tagWarning: {
        backgroundColor: '#FEF3C7',
    },
    tagWarningText: {
        color: '#92400E',
    },
    emptyText: {
        fontSize: 16,
        color: '#9CA3AF',
    },
    menuBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.2)',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        paddingTop: 60,
        paddingRight: 16,
    },
    menu: {
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 4,
        minWidth: 220,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    menuText: {
        fontSize: 15,
        color: '#1A1A1A',
    },
});
