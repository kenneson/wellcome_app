import { ReportSheet } from '@/components/ui/ReportSheet';
import { moderationService } from '@/services/api/ModerationService';
import { UserProfile, userService } from '@/services/api/UserService';
import { supabase } from '@/shared/lib/supabase';
import { queryClient } from '@/shared/lib/react-query';
import { DEFAULT_AVATAR_PLACEHOLDER } from '@/shared/lib/styles';
import { getOptimizedImageUrl } from '@/utils/imageOptimizer';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import { BrandSheet, BrandStackHeader, HeaderIconButton } from '@/components/ui/wellcome';
import { BorderRadius, Elevation, Palette, Spacing } from '@/shared/constants/theme';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { friendlyErrorMessage } from '@/shared/lib/errorMessages';

export default function PublicProfileScreen() {
    const { id } = useLocalSearchParams();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isBlocked, setIsBlocked] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);
    const [reportVisible, setReportVisible] = useState(false);

    const profileId = id as string;
    const isOwnProfile = !!currentUserId && currentUserId === profileId;

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

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch when the id changes
        if (id) fetchProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when the id changes
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
            Alert.alert('Erro', friendlyErrorMessage(error, 'Não foi possível concluir a ação.'));
        }
    }

    if (loading) {
        return (
            <View style={styles.container}>
                <BrandStackHeader eyebrow="PERFIL" title="Perfil" />
                <BrandSheet>
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={Palette.orange} />
                    </View>
                </BrandSheet>
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={styles.container}>
                <BrandStackHeader eyebrow="PERFIL" title="Perfil" />
                <BrandSheet>
                    <View style={styles.center}>
                        <View style={styles.emptyIcon}>
                            <Ionicons name="person-outline" size={32} color={Palette.orangeDeep} />
                        </View>
                        <Text style={styles.emptyText}>Perfil não encontrado.</Text>
                    </View>
                </BrandSheet>
            </View>
        );
    }

    const optimizedAvatar = getOptimizedImageUrl(profile.avatarUrl, { width: 200 });
    const location = [profile.city, profile.neighborhood].filter(Boolean).join(' • ');
    const pastEvents = profile.bookings?.filter((b: any) => b.status === 'APPROVED').length || 0;
    const hostedEvents = profile.events?.length || 0;

    return (
        <View style={styles.container}>
            <BrandStackHeader
                eyebrow="PERFIL"
                title={profile.fullName || 'Usuário'}
                actions={!isOwnProfile ? (
                    <HeaderIconButton icon="ellipsis-horizontal" accessibilityLabel="Mais opções" onPress={() => setMenuVisible(true)} />
                ) : undefined}
            />

            <BrandSheet>
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
                                <Ionicons name="location-outline" size={14} color={Palette.muted} />
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
                                        <Ionicons name="globe-outline" size={14} color={Palette.orangeDeep} />
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
                                        <Ionicons name="alert-circle-outline" size={14} color={Palette.orangeDarker} />
                                        <Text style={[styles.tagText, styles.tagWarningText]}>{restriction}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    <View style={{ height: Spacing.xxxl }} />
                </ScrollView>

            </BrandSheet>

            {/* Menu de moderação */}
            <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
                <Pressable style={styles.menuBackdrop} onPress={() => setMenuVisible(false)}>
                    <View style={styles.menu}>
                        <TouchableOpacity style={styles.menuItem} onPress={toggleBlock} accessibilityRole="button">
                            <Ionicons name={isBlocked ? 'lock-open-outline' : 'ban-outline'} size={20} color={Palette.ink} />
                            <Text style={styles.menuText}>{isBlocked ? 'Desbloquear usuário' : 'Bloquear usuário'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => { setMenuVisible(false); setReportVisible(true); }}
                            accessibilityRole="button"
                        >
                            <Ionicons name="flag-outline" size={20} color={Palette.danger} />
                            <Text style={[styles.menuText, styles.menuTextDanger]}>Denunciar usuário</Text>
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Palette.paper,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: Spacing.md,
        padding: Spacing.xl,
    },
    content: {
        padding: Spacing.xl,
    },
    profileHeader: {
        alignItems: 'center',
        backgroundColor: Palette.surface,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        padding: Spacing.xl,
        marginBottom: Spacing.lg,
    },
    avatar: {
        width: 112,
        height: 112,
        borderRadius: 56,
        backgroundColor: Palette.track,
        borderWidth: 3,
        borderColor: Palette.orangeSoft,
        marginBottom: Spacing.md,
    },
    name: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.3,
        color: Palette.ink,
        marginBottom: 4,
        textAlign: 'center',
    },
    occupation: {
        fontSize: 15,
        color: Palette.inkSoft,
        marginBottom: 8,
        textAlign: 'center',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    locationText: {
        fontSize: 14,
        color: Palette.muted,
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: Palette.surface,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        padding: Spacing.xl,
        marginBottom: Spacing.xl,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        backgroundColor: Palette.line,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: '800',
        color: Palette.ink,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        color: Palette.muted,
        textAlign: 'center',
    },
    section: {
        marginBottom: Spacing.xl,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: Palette.ink,
        marginBottom: Spacing.sm,
    },
    bioText: {
        fontSize: 15,
        color: Palette.inkSoft,
        lineHeight: 21,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Palette.track,
        paddingHorizontal: Spacing.md,
        paddingVertical: 7,
        borderRadius: BorderRadius.full,
        gap: 6,
    },
    tagText: {
        fontSize: 13,
        color: Palette.ink,
        fontWeight: '700',
    },
    tagWarning: {
        backgroundColor: Palette.orangeSoft,
    },
    tagWarningText: {
        color: Palette.orangeDarker,
    },
    emptyIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: Palette.orangeSoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '800',
        color: Palette.ink,
    },
    menuBackdrop: {
        flex: 1,
        backgroundColor: Palette.scrim,
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        paddingTop: 100,
        paddingRight: Spacing.xl,
    },
    menu: {
        backgroundColor: Palette.surface,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        paddingVertical: 6,
        minWidth: 230,
        ...Elevation.card,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: Spacing.lg,
        minHeight: 48,
    },
    menuText: {
        fontSize: 15,
        fontWeight: '700',
        color: Palette.ink,
    },
    menuTextDanger: {
        color: Palette.danger,
    },
});
