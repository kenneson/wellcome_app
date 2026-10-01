import { AppIcon as Ionicons } from '@/components/ui/icon';
import { BrandHeader, BrandSheet, HeaderIconButton } from '@/components/ui/wellcome';
import { useMyProfile } from '@/hooks/useMyProfile';
import { BorderRadius, Palette, Spacing } from '@/shared/constants/theme';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

type ShortcutRow = {
    icon: string;
    title: string;
    subtitle: string;
    href: string;
};

const SHORTCUTS: ShortcutRow[] = [
    { icon: 'pencil-outline', title: 'Editar perfil', subtitle: 'Foto, bio e informações pessoais', href: '/profile/edit' },
    { icon: 'chatbubbles-outline', title: 'Mensagens', subtitle: 'Conversas com anfitriões e convidados', href: '/messages' },
    { icon: 'card-outline', title: 'Pagamentos e cartões', subtitle: 'Dados de cobrança e cartões salvos', href: '/profile/payments' },
    { icon: 'pix', title: 'Chave Pix', subtitle: 'Conta de destino para seus saques', href: '/profile/pix-key' },
];

export default function ProfileScreen() {
    const router = useRouter();
    const { userId, data: profile, isLoading, refetch } = useMyProfile();
    const [now, setNow] = useState(() => Date.now());

    useFocusEffect(
        useCallback(() => {
            setNow(Date.now());
            if (userId) void refetch();
        }, [refetch, userId])
    );

    if (!userId || isLoading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={Palette.orange} />
                <Text style={styles.loadingText}>Carregando perfil…</Text>
            </View>
        );
    }

    const participated = (profile?.bookings ?? []).filter((booking: any) =>
        booking.status === 'APPROVED'
        && booking.event?.eventDate
        && new Date(booking.event.eventDate).getTime() < now
    ).length;
    const offered = profile?.events?.length || 0;
    const subtitle = [profile?.occupation, profile?.city].filter(Boolean).join(' · ');
    const balance = Number(profile?.walletBalance ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <View style={styles.container}>
            <BrandHeader
                style={styles.header}
                actions={(
                    <HeaderIconButton
                        icon="settings-outline"
                        accessibilityLabel="Configurações"
                        onPress={() => router.push('/profile/settings' as any)}
                    />
                )}
            >
                <View style={styles.identity}>
                    <TouchableOpacity
                        style={styles.avatarContainer}
                        onPress={() => router.push('/profile/edit')}
                        accessibilityRole="button"
                        accessibilityLabel="Editar foto e perfil"
                    >
                        {profile?.avatarUrl ? (
                            <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} contentFit="cover" />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Ionicons name="person.fill" size={40} color={Palette.orangeDeep} />
                            </View>
                        )}
                        <View style={styles.editBadge}>
                            <Ionicons name="pencil" size={14} color={Palette.orangeDeep} />
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.name} numberOfLines={1} accessibilityRole="header">
                        {profile?.fullName || 'Usuário'}
                    </Text>
                    {!!subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
                </View>
            </BrandHeader>

            <BrandSheet>
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    {!!profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}

                    <View style={styles.statsRow}>
                        <TouchableOpacity
                            style={styles.statCard}
                            onPress={() => router.navigate('/(tabs)/host-events' as any)}
                            accessibilityRole="button"
                            accessibilityLabel={`${offered} eventos oferecidos. Abrir central do anfitrião`}
                        >
                            <Text style={styles.statNumber}>{offered}</Text>
                            <Text style={styles.statLabel}>Eventos oferecidos</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.statCard}
                            onPress={() => router.navigate('/(tabs)/reservations' as any)}
                            accessibilityRole="button"
                            accessibilityLabel={`${participated} participações. Abrir reservas`}
                        >
                            <Text style={styles.statNumber}>{participated}</Text>
                            <Text style={styles.statLabel}>Participações</Text>
                        </TouchableOpacity>
                        {typeof profile?.averageRating === 'number' && profile.averageRating > 0 && (
                            <View style={styles.statCard} accessible accessibilityLabel={`Avaliação média ${profile.averageRating.toFixed(1)}`}>
                                <View style={styles.ratingRow}>
                                    <Text style={styles.statNumber}>{profile.averageRating.toFixed(1).replace('.', ',')}</Text>
                                    <Ionicons name="star" size={16} color={Palette.star} />
                                </View>
                                <Text style={styles.statLabel}>Avaliação</Text>
                            </View>
                        )}
                    </View>

                    <TouchableOpacity
                        style={styles.walletCard}
                        onPress={() => router.push('/profile/wallet')}
                        accessibilityRole="button"
                        accessibilityLabel={`Carteira: R$ ${balance}. Abrir carteira e saques`}
                    >
                        <View style={styles.walletInfo}>
                            <Text style={styles.walletTitle}>Saldo na carteira</Text>
                            <Text style={styles.walletBalance}>R$ {balance}</Text>
                        </View>
                        <View style={styles.walletAction}>
                            <Text style={styles.walletActionText}>Ver carteira</Text>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.list}>
                        {SHORTCUTS.map((row, index) => (
                            <TouchableOpacity
                                key={row.href}
                                style={[styles.row, index < SHORTCUTS.length - 1 && styles.rowDivider]}
                                onPress={() => router.push(row.href as any)}
                                accessibilityRole="button"
                                accessibilityLabel={row.title}
                                accessibilityHint={row.subtitle}
                            >
                                <View style={styles.rowIcon}>
                                    <Ionicons name={row.icon} size={20} color={Palette.orangeDeep} />
                                </View>
                                <View style={styles.rowCopy}>
                                    <Text style={styles.rowTitle}>{row.title}</Text>
                                    <Text style={styles.rowSubtitle} numberOfLines={1}>{row.subtitle}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={Palette.subtle} />
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity
                        style={styles.settingsLink}
                        onPress={() => router.push('/profile/settings' as any)}
                        accessibilityRole="button"
                    >
                        <Ionicons name="settings-outline" size={18} color={Palette.inkSoft} />
                        <Text style={styles.settingsLinkText}>Configurações, termos e conta</Text>
                    </TouchableOpacity>
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
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: Spacing.md,
        color: Palette.inkSoft,
    },
    header: {
        paddingBottom: 56,
    },
    identity: {
        alignItems: 'center',
        gap: 4,
        marginTop: -Spacing.xxxl,
    },
    avatarContainer: {
        marginBottom: Spacing.sm,
    },
    avatarImage: {
        width: 92,
        height: 92,
        borderRadius: 46,
        borderWidth: 3,
        borderColor: '#FFFFFF',
        backgroundColor: Palette.orangeSoft,
    },
    avatarPlaceholder: {
        width: 92,
        height: 92,
        borderRadius: 46,
        borderWidth: 3,
        borderColor: '#FFFFFF',
        backgroundColor: Palette.orangeSoft,
        justifyContent: 'center',
        alignItems: 'center',
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    name: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    subtitle: {
        fontSize: 13,
        fontWeight: '600',
        color: Palette.orangeOnBrand,
    },
    content: {
        padding: Spacing.xl,
        paddingBottom: Spacing.xxxl * 2,
        gap: Spacing.md,
    },
    bio: {
        fontSize: 14,
        lineHeight: 21,
        color: Palette.inkSoft,
        textAlign: 'center',
        paddingHorizontal: Spacing.sm,
    },
    statsRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    statCard: {
        flex: 1,
        padding: 14,
        borderRadius: 18,
        backgroundColor: Palette.surface,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        gap: 2,
    },
    statNumber: {
        fontSize: 22,
        fontWeight: '800',
        color: Palette.ink,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: Palette.inkSoft,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    walletCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        padding: Spacing.lg,
        borderRadius: 20,
        backgroundColor: Palette.ink,
    },
    walletInfo: {
        flex: 1,
        gap: 2,
    },
    walletTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#E9DAD1',
    },
    walletBalance: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    walletAction: {
        minHeight: 36,
        paddingHorizontal: 14,
        borderRadius: BorderRadius.full,
        backgroundColor: Palette.orange,
        justifyContent: 'center',
    },
    walletActionText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    list: {
        borderRadius: 20,
        backgroundColor: Palette.surface,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: 14,
        minHeight: 64,
    },
    rowDivider: {
        borderBottomWidth: 1,
        borderBottomColor: Palette.lineSoft,
    },
    rowIcon: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: Palette.orangeSoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowCopy: {
        flex: 1,
        gap: 2,
    },
    rowTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: Palette.ink,
    },
    rowSubtitle: {
        fontSize: 12,
        color: Palette.muted,
    },
    settingsLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        minHeight: 48,
    },
    settingsLinkText: {
        fontSize: 14,
        fontWeight: '700',
        color: Palette.inkSoft,
    },
});
