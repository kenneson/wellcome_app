import { UserProfile, userService } from '@/services/api/UserService';
import { DEFAULT_AVATAR_PLACEHOLDER } from '@/shared/lib/styles';
import { getOptimizedImageUrl } from '@/utils/imageOptimizer';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PublicProfileScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchProfile();
    }, [id]);

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
                        <Ionicons name="arrow-back" size={24} color="#333333" />
                    </TouchableOpacity>
                </View>
                <View style={styles.center}>
                    <Text style={styles.emptyText}>Perfil não encontrado.</Text>
                </View>
            </SafeAreaView>
        );
    }

    const optimizedAvatar = getOptimizedImageUrl(profile.avatarUrl, { width: 200 });
    const location = [profile.city, profile.neighborhood].filter(Boolean).join(' â€¢ ');
    const pastEvents = profile.bookings?.filter((b: any) => b.status === 'APPROVED').length || 0;
    const hostedEvents = profile.events?.length || 0;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Perfil</Text>
                <View style={{ width: 32 }} />
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
        color: '#333333',
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
        color: '#333333',
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
        color: '#333333',
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
        color: '#333333',
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
});
