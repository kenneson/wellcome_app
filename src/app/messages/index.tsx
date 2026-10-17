import { AppIcon as Ionicons } from '@/components/ui/icon';
import { BrandSheet, BrandStackHeader } from '@/components/ui/wellcome';
import { ChatConversation, chatService } from '@/services/api/ChatService';
import { BorderRadius, Palette, Spacing } from '@/shared/constants/theme';
import { DEFAULT_AVATAR_PLACEHOLDER } from '@/shared/lib/styles';
import { supabase } from '@/shared/lib/supabase';
import { Image } from 'expo-image';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function MessagesScreen() {
    const router = useRouter();
    const [conversations, setConversations] = useState<ChatConversation[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const [{ data: { session } }, data] = await Promise.all([
                supabase.auth.getSession(),
                chatService.list(),
            ]);
            setCurrentUserId(session?.user.id || null);
            setConversations(data);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => {
        void load();
        const timer = setInterval(() => void load(true), 10000);
        return () => clearInterval(timer);
    }, [load]));

    const renderConversation = ({ item }: { item: ChatConversation }) => {
        const other = item.hostId === currentUserId ? item.guest : item.host;
        const unread = item.unreadCount || 0;
        return (
            <TouchableOpacity
                style={styles.item}
                activeOpacity={0.8}
                onPress={() => router.push(`/messages/${item.id}` as any)}
                accessibilityRole="button"
                accessibilityLabel={`Conversa com ${other.fullName || 'Participante'}${unread > 0 ? `, ${unread} não lidas` : ''}`}
            >
                <Image
                    source={{ uri: other.avatarUrl || DEFAULT_AVATAR_PLACEHOLDER }}
                    style={styles.avatar}
                    contentFit="cover"
                />
                <View style={styles.itemBody}>
                    <View style={styles.itemHeader}>
                        <Text style={[styles.name, unread > 0 && styles.unreadText]} numberOfLines={1}>
                            {other.fullName || 'Participante'}
                        </Text>
                        <Text style={styles.time}>{formatListTime(item.lastMessageAt)}</Text>
                    </View>
                    <Text style={styles.eventTitle} numberOfLines={1}>{item.event.title}</Text>
                    <View style={styles.previewRow}>
                        <Text style={[styles.preview, unread > 0 && styles.unreadText]} numberOfLines={1}>
                            {item.lastMessage?.body || 'Inicie a conversa'}
                        </Text>
                        {unread > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <BrandStackHeader eyebrow="CONVERSAS" title="Mensagens" />

            <BrandSheet>
                {loading ? (
                    <View style={styles.center}><ActivityIndicator size="large" color={Palette.orange} /></View>
                ) : (
                    <FlatList
                        data={conversations}
                        keyExtractor={(item) => item.id}
                        renderItem={renderConversation}
                        showsVerticalScrollIndicator={false}
                        refreshControl={(
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={() => { setRefreshing(true); void load(true); }}
                                tintColor={Palette.orange}
                                colors={[Palette.orange]}
                            />
                        )}
                        contentContainerStyle={conversations.length ? styles.list : styles.emptyList}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <View style={styles.emptyIcon}><Ionicons name="chatbubbles-outline" size={32} color={Palette.orangeDeep} /></View>
                                <Text style={styles.emptyTitle}>Nenhuma conversa ainda</Text>
                                <Text style={styles.emptyText}>Abra um evento e toque em “Perguntar ao anfitrião”.</Text>
                            </View>
                        }
                    />
                )}
            </BrandSheet>
        </View>
    );
}

function formatListTime(value: string) {
    const date = new Date(value);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Palette.paper },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { padding: Spacing.xl, paddingBottom: Spacing.xxxl * 2, gap: Spacing.md },
    emptyList: { flexGrow: 1, padding: Spacing.xl },
    item: {
        flexDirection: 'row',
        padding: 14,
        minHeight: 86,
        backgroundColor: Palette.surface,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
    },
    avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: Palette.track },
    itemBody: { flex: 1, marginLeft: Spacing.md, justifyContent: 'center' },
    itemHeader: { flexDirection: 'row', alignItems: 'center' },
    name: { flex: 1, fontSize: 16, fontWeight: '700', color: Palette.ink },
    time: { marginLeft: 8, fontSize: 12, color: Palette.muted },
    eventTitle: { fontSize: 12, color: Palette.orangeDeep, marginTop: 2, fontWeight: '700' },
    previewRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
    preview: { flex: 1, fontSize: 14, color: Palette.inkSoft },
    unreadText: { fontWeight: '800', color: Palette.ink },
    badge: { minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: BorderRadius.full, backgroundColor: Palette.orange, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
    badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxxl, gap: Spacing.md },
    emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: Palette.orangeSoft, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: Palette.ink, textAlign: 'center' },
    emptyText: { fontSize: 14, lineHeight: 21, color: Palette.inkSoft, textAlign: 'center', maxWidth: 300 },
});
