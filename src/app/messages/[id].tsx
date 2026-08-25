import { ReportSheet } from '@/components/ui/ReportSheet';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import { ChatConversation, ChatMessage, chatService } from '@/services/api/ChatService';
import { DEFAULT_AVATAR_PLACEHOLDER } from '@/shared/lib/styles';
import { supabase } from '@/shared/lib/supabase';
import { Image } from 'expo-image';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ConversationScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const listRef = useRef<FlatList<ChatMessage>>(null);
    const [conversation, setConversation] = useState<ChatConversation | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [reportVisible, setReportVisible] = useState(false);

    const load = useCallback(async (silent = false) => {
        if (!id) return;
        try {
            if (!silent) setLoading(true);
            const [{ data: { session } }, conversationData, messageData] = await Promise.all([
                supabase.auth.getSession(),
                chatService.get(id),
                chatService.messages(id),
            ]);
            setCurrentUserId(session?.user.id || null);
            setConversation(conversationData);
            setMessages(messageData);
            void chatService.markRead(id);
        } catch (error: any) {
            if (!silent) Alert.alert('Mensagens', error?.message || 'Não foi possível carregar a conversa.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useFocusEffect(useCallback(() => {
        void load();
        const timer = setInterval(() => void load(true), 5000);
        return () => clearInterval(timer);
    }, [load]));

    const send = async () => {
        const body = draft.trim();
        if (!id || !body || sending) return;
        setSending(true);
        setDraft('');
        try {
            const created = await chatService.send(id, body);
            setMessages((current) => current.some((item) => item.id === created.id) ? current : [...current, created]);
            requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
        } catch (error: any) {
            setDraft(body);
            Alert.alert('Não foi possível enviar', error?.message || 'Tente novamente.');
        } finally {
            setSending(false);
        }
    };

    const other = conversation && currentUserId
        ? (conversation.hostId === currentUserId ? conversation.guest : conversation.host)
        : null;

    if (loading && !conversation) {
        return <View style={styles.loading}><ActivityIndicator size="large" color="#FF8C42" /></View>;
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerButton} hitSlop={10} accessibilityLabel="Voltar">
                        <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                    </TouchableOpacity>
                    <Image source={{ uri: other?.avatarUrl || DEFAULT_AVATAR_PLACEHOLDER }} style={styles.avatar} contentFit="cover" />
                    <View style={styles.headerText}>
                        <Text style={styles.name} numberOfLines={1}>{other?.fullName || 'Participante'}</Text>
                        <Text style={styles.eventTitle} numberOfLines={1}>{conversation?.event.title}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setReportVisible(true)} style={styles.headerButton} accessibilityLabel="Denunciar conversa">
                        <Ionicons name="flag-outline" size={22} color="#6B7280" />
                    </TouchableOpacity>
                </View>

                <FlatList
                    ref={listRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <MessageBubble message={item} mine={item.senderId === currentUserId} />}
                    contentContainerStyle={styles.messages}
                    onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                    ListHeaderComponent={
                        <View style={styles.contextCard}>
                            <Ionicons name="shield-checkmark-outline" size={18} color="#C96D22" />
                            <Text style={styles.contextText}>Conversa vinculada ao evento. O histórico pode ser usado para suporte e análise de denúncias.</Text>
                        </View>
                    }
                />

                <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
                    <TextInput
                        style={styles.input}
                        value={draft}
                        onChangeText={setDraft}
                        placeholder="Escreva uma mensagem"
                        placeholderTextColor="#9CA3AF"
                        multiline
                        maxLength={2000}
                        editable={!sending}
                        textAlignVertical="top"
                        onFocus={() => requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }))}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, (!draft.trim() || sending) && styles.sendDisabled]}
                        onPress={send}
                        disabled={!draft.trim() || sending}
                        accessibilityLabel="Enviar mensagem"
                    >
                        {sending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="send" size={20} color="#FFFFFF" />}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {!!other?.id && (
                <ReportSheet
                    visible={reportVisible}
                    onClose={() => setReportVisible(false)}
                    targetType="USER"
                    targetId={other.id}
                />
            )}
        </SafeAreaView>
    );
}

function MessageBubble({ message, mine }: { message: ChatMessage; mine: boolean }) {
    if (message.kind === 'SYSTEM') {
        const address = message.metadata?.type === 'ADDRESS_RELEASED';
        return (
            <View style={[styles.systemMessage, address && styles.addressMessage]}>
                <Ionicons name={address ? 'location-outline' : 'information-circle-outline'} size={16} color={address ? '#C96D22' : '#6B7280'} />
                <Text style={[styles.systemText, address && styles.addressText]}>{message.body}</Text>
            </View>
        );
    }
    return (
        <View style={[styles.bubbleRow, mine ? styles.mineRow : styles.theirRow]}>
            <View style={[styles.bubble, mine ? styles.mineBubble : styles.theirBubble]}>
                <Text style={[styles.messageText, mine && styles.mineText]}>{message.body}</Text>
                <Text style={[styles.messageTime, mine && styles.mineTime]}>
                    {new Date(message.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
    header: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB', backgroundColor: '#FFFFFF' },
    headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6' },
    headerText: { flex: 1, marginLeft: 10, marginRight: 4 },
    name: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
    eventTitle: { marginTop: 1, fontSize: 12, color: '#FF8C42' },
    messages: { paddingHorizontal: 12, paddingVertical: 14, flexGrow: 1, justifyContent: 'flex-end' },
    contextCard: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderRadius: 12, backgroundColor: '#FFF7EF', marginBottom: 14 },
    contextText: { flex: 1, marginLeft: 8, color: '#7C4A24', fontSize: 12, lineHeight: 18 },
    systemMessage: { alignSelf: 'center', flexDirection: 'row', alignItems: 'flex-start', maxWidth: '92%', paddingHorizontal: 12, paddingVertical: 9, marginVertical: 7, borderRadius: 12, backgroundColor: '#F3F4F6' },
    addressMessage: { backgroundColor: '#FFF3E8', borderWidth: 1, borderColor: '#FFD5B3' },
    systemText: { flex: 1, marginLeft: 6, fontSize: 12, lineHeight: 17, color: '#6B7280', textAlign: 'center' },
    addressText: { color: '#8A4B1D', fontWeight: '600', textAlign: 'left' },
    bubbleRow: { flexDirection: 'row', marginVertical: 3 },
    mineRow: { justifyContent: 'flex-end' },
    theirRow: { justifyContent: 'flex-start' },
    bubble: { maxWidth: '82%', paddingHorizontal: 13, paddingTop: 9, paddingBottom: 6, borderRadius: 17 },
    mineBubble: { backgroundColor: '#FF8C42', borderBottomRightRadius: 5 },
    theirBubble: { backgroundColor: '#F3F4F6', borderBottomLeftRadius: 5 },
    messageText: { fontSize: 15, lineHeight: 20, color: '#1A1A1A' },
    mineText: { color: '#FFFFFF' },
    messageTime: { alignSelf: 'flex-end', marginTop: 3, fontSize: 10, color: '#9CA3AF' },
    mineTime: { color: 'rgba(255,255,255,0.78)' },
    composer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB', backgroundColor: '#FFFFFF' },
    input: { flex: 1, minHeight: 46, maxHeight: 120, paddingHorizontal: 15, paddingVertical: 12, borderRadius: 23, backgroundColor: '#F3F4F6', color: '#1A1A1A', fontSize: 15 },
    sendButton: { width: 46, height: 46, borderRadius: 23, marginLeft: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF8C42' },
    sendDisabled: { opacity: 0.45 },
});
