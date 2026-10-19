import { ReportSheet } from '@/components/ui/ReportSheet';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import { BrandSheet, BrandStackHeader, HeaderIconButton } from '@/components/ui/wellcome';
import { ChatConversation, ChatMessage, chatService } from '@/services/api/ChatService';
import { BorderRadius, Palette, Spacing } from '@/shared/constants/theme';
import { supabase } from '@/shared/lib/supabase';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { friendlyErrorMessage } from '@/shared/lib/errorMessages';

export default function ConversationScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
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
            if (!silent) Alert.alert('Mensagens', friendlyErrorMessage(error, 'Não foi possível carregar a conversa.'));
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
            Alert.alert('Não foi possível enviar', friendlyErrorMessage(error, 'Tente novamente.'));
        } finally {
            setSending(false);
        }
    };

    const other = conversation && currentUserId
        ? (conversation.hostId === currentUserId ? conversation.guest : conversation.host)
        : null;

    if (loading && !conversation) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <BrandStackHeader eyebrow="CONVERSA" title="Mensagens" />
                <BrandSheet>
                    <View style={styles.loading}><ActivityIndicator size="large" color={Palette.orange} /></View>
                </BrandSheet>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                <BrandStackHeader
                    eyebrow={conversation?.event.title ? conversation.event.title.toUpperCase() : 'CONVERSA'}
                    title={other?.fullName || 'Participante'}
                    actions={(
                        <HeaderIconButton icon="flag-outline" accessibilityLabel="Denunciar conversa" onPress={() => setReportVisible(true)} />
                    )}
                />

                <BrandSheet>
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
                                <Ionicons name="shield-checkmark-outline" size={18} color={Palette.orangeDeep} />
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
                            placeholderTextColor={Palette.subtle}
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
                            accessibilityRole="button"
                            accessibilityLabel="Enviar mensagem"
                        >
                            {sending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="send" size={20} color="#FFFFFF" />}
                        </TouchableOpacity>
                    </View>
                </BrandSheet>
            </KeyboardAvoidingView>

            {!!other?.id && (
                <ReportSheet
                    visible={reportVisible}
                    onClose={() => setReportVisible(false)}
                    targetType="USER"
                    targetId={other.id}
                />
            )}
        </View>
    );
}

function MessageBubble({ message, mine }: { message: ChatMessage; mine: boolean }) {
    if (message.kind === 'SYSTEM') {
        const address = message.metadata?.type === 'ADDRESS_RELEASED';
        return (
            <View style={[styles.systemMessage, address && styles.addressMessage]}>
                <Ionicons name={address ? 'location-outline' : 'information-circle-outline'} size={16} color={address ? Palette.orangeDeep : Palette.inkSoft} />
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
    container: { flex: 1, backgroundColor: Palette.paper },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    messages: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.md, flexGrow: 1, justifyContent: 'flex-end' },
    contextCard: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, borderRadius: 22, backgroundColor: Palette.orangeSoft, marginBottom: Spacing.lg },
    contextText: { flex: 1, marginLeft: 8, color: Palette.orangeDarker, fontSize: 12, lineHeight: 18 },
    systemMessage: { alignSelf: 'center', flexDirection: 'row', alignItems: 'flex-start', maxWidth: '92%', paddingHorizontal: Spacing.md, paddingVertical: 9, marginVertical: 7, borderRadius: BorderRadius.lg, backgroundColor: Palette.track },
    addressMessage: { backgroundColor: Palette.orangeSoft, borderWidth: 1, borderColor: Palette.line },
    systemText: { flex: 1, marginLeft: 6, fontSize: 12, lineHeight: 17, color: Palette.inkSoft, textAlign: 'center' },
    addressText: { color: Palette.orangeDarker, fontWeight: '700', textAlign: 'left' },
    bubbleRow: { flexDirection: 'row', marginVertical: 3 },
    mineRow: { justifyContent: 'flex-end' },
    theirRow: { justifyContent: 'flex-start' },
    bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingTop: 9, paddingBottom: 6, borderRadius: 20 },
    mineBubble: { backgroundColor: Palette.orange, borderBottomRightRadius: 6 },
    theirBubble: { backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.lineSoft, borderBottomLeftRadius: 6 },
    messageText: { fontSize: 15, lineHeight: 21, color: Palette.ink },
    mineText: { color: '#FFFFFF' },
    messageTime: { alignSelf: 'flex-end', marginTop: 3, fontSize: 10, color: Palette.muted },
    mineTime: { color: Palette.orangeOnBrand },
    composer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Palette.lineSoft, backgroundColor: Palette.surface },
    input: { flex: 1, minHeight: 48, maxHeight: 120, paddingHorizontal: Spacing.lg, paddingTop: 13, paddingBottom: 13, borderRadius: 24, borderWidth: 1, borderColor: Palette.line, backgroundColor: Palette.paper, color: Palette.ink, fontSize: 15 },
    sendButton: { width: 48, height: 48, borderRadius: BorderRadius.full, marginLeft: Spacing.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.orange },
    sendDisabled: { opacity: 0.45 },
});
