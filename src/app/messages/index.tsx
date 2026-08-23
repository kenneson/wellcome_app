import { AppIcon as Ionicons } from '@/components/ui/icon';
import { ChatConversation, chatService } from '@/services/api/ChatService';
import { DEFAULT_AVATAR_PLACEHOLDER } from '@/shared/lib/styles';
import { supabase } from '@/shared/lib/supabase';
import { Image } from 'expo-image';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
                activeOpacity={0.75}
                onPress={() => router.push(`/messages/${item.id}` as any)}
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
        <SafeAreaView style={styles.container} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} hitSlop={10}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.title}>Mensagens</Text>
                <View style={styles.iconButton} />
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#FF8C42" /></View>
            ) : (
                <FlatList
                    data={conversations}
                    keyExtractor={(item) => item.id}
                    renderItem={renderConversation}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(true); }} tintColor="#FF8C42" />}
                    contentContainerStyle={conversations.length ? styles.list : styles.emptyList}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <View style={styles.emptyIcon}><Ionicons name="chatbubbles-outline" size={42} color="#FF8C42" /></View>
                            <Text style={styles.emptyTitle}>Nenhuma conversa ainda</Text>
                            <Text style={styles.emptyText}>Abra um evento e toque em “Perguntar ao anfitrião”.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
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
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
    iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { paddingVertical: 8 },
    emptyList: { flexGrow: 1 },
    item: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 13, minHeight: 86, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F0F0F0' },
    avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#F3F4F6' },
    itemBody: { flex: 1, marginLeft: 12, justifyContent: 'center' },
    itemHeader: { flexDirection: 'row', alignItems: 'center' },
    name: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
    time: { marginLeft: 8, fontSize: 12, color: '#9CA3AF' },
    eventTitle: { fontSize: 12, color: '#FF8C42', marginTop: 2, fontWeight: '600' },
    previewRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
    preview: { flex: 1, fontSize: 14, color: '#6B7280' },
    unreadText: { fontWeight: '700', color: '#1A1A1A' },
    badge: { minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: '#FF8C42', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
    badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
    emptyIcon: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#FFF3E8', alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { marginTop: 18, fontSize: 19, fontWeight: '700', color: '#1A1A1A' },
    emptyText: { marginTop: 8, fontSize: 14, lineHeight: 21, color: '#6B7280', textAlign: 'center' },
});
