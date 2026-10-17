import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { BrandSheet, BrandStackHeader } from '@/components/ui/wellcome';
import { AppIcon as Ionicons } from '@/components/ui/icon';
import { Palette, Spacing } from '@/shared/constants/theme';
import { notificationService, Notification } from '@/services/api/NotificationService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function NotificationsScreen() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchNotifications = useCallback(async () => {
        try {
            const data = await notificationService.list();
            setNotifications(data);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            // Optional: show silent error or toast
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
        fetchNotifications();
    }, [fetchNotifications]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    const handlePress = async (notification: Notification) => {
        // 1. Mark as read if needed
        if (!notification.read) {
            try {
                await notificationService.markAsRead(notification.id);
                // Optimistic update
                setNotifications(prev =>
                    prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
                );
            } catch (e) {
                console.error('Failed to mark as read', e);
            }
        }

        // 2. Navigate based on type/data
        if (notification.data?.conversationId) {
            router.push(`/messages/${notification.data.conversationId}` as any);
        } else if (notification.data && notification.data.eventId) {
            router.push(`/events/${notification.data.eventId}`);
        } else {
            // Default action if just informational
            // Maybe show a modal or alert with full details?
            // For now, do nothing else.
        }
    };

    const renderItem = ({ item }: { item: Notification }) => (
        <TouchableOpacity
            style={[styles.item, !item.read && styles.unreadItem]}
            onPress={() => handlePress(item)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`${item.read ? '' : 'Não lida, '}${item.title}`}
        >
            <View style={[styles.iconContainer, !item.read && styles.iconContainerUnread]}>
                <Ionicons
                    name={getIconName(item.type)}
                    size={22}
                    color={!item.read ? Palette.orangeDeep : Palette.muted}
                />
            </View>
            <View style={styles.contentContainer}>
                <View style={styles.itemHeader}>
                    <Text style={[styles.itemTitle, !item.read && styles.unreadText]} numberOfLines={1}>
                        {item.title}
                    </Text>
                    {!item.read && <View style={styles.dot} />}
                </View>
                <Text style={styles.itemBody} numberOfLines={2}>
                    {item.body}
                </Text>
                <Text style={styles.itemDate}>
                    {format(new Date(item.createdAt), "d 'de' MMM, HH:mm", { locale: ptBR })}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Palette.subtle} style={{ marginLeft: 8 }} />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <BrandStackHeader eyebrow="AVISOS" title="Notificações" backIcon="close" />

            <BrandSheet>
                {loading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={Palette.orange} />
                    </View>
                ) : (
                    <FlatList
                        data={notifications}
                        keyExtractor={item => item.id}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={handleRefresh}
                                tintColor={Palette.orange}
                                colors={[Palette.orange]}
                            />
                        }
                        contentContainerStyle={notifications.length === 0 ? styles.emptyList : styles.listContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <View style={styles.emptyIcon}>
                                    <Ionicons name="notifications-off-outline" size={32} color={Palette.orangeDeep} />
                                </View>
                                <Text style={styles.emptyText}>Nenhuma notificação encontrada</Text>
                            </View>
                        }
                        renderItem={renderItem}
                    />
                )}
            </BrandSheet>
        </View>
    );
}

function getIconName(type: string): string {
    switch (type) {
        case 'REGISTRATION_APPROVED': return 'checkmark-circle-outline';
        case 'REGISTRATION_REJECTED': return 'close-circle-outline';
        case 'NEW_REGISTRATION_PENDING': return 'person-add-outline';
        case 'NEW_REGISTRATION_CONFIRMED': return 'people-outline';
        case 'EVENT_UPDATE': return 'calendar-outline';
        case 'EVENT_REMINDER': return 'alarm-outline';
        case 'EVENT_CANCELED': return 'alert-circle-outline';
        case 'PARTICIPANT_CANCELED': return 'person-remove-outline';
        case 'NEW_REVIEW': return 'star-outline';
        case 'CHAT_MESSAGE': return 'chatbubble-ellipses-outline';
        default: return 'notifications-outline';
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Palette.paper,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: Spacing.xl,
        paddingBottom: Spacing.xxxl * 2,
        gap: Spacing.md,
    },
    emptyList: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: Spacing.xl,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: Spacing.xxxl,
        gap: Spacing.md,
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
        color: Palette.ink,
        fontSize: 18,
        fontWeight: '800',
        textAlign: 'center',
    },
    item: {
        flexDirection: 'row',
        padding: 14,
        alignItems: 'center',
        backgroundColor: Palette.surface,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Palette.lineSoft,
    },
    unreadItem: {
        borderColor: Palette.line,
    },
    iconContainer: {
        marginRight: Spacing.md,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Palette.track,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainerUnread: {
        backgroundColor: Palette.orangeSoft,
    },
    contentContainer: {
        flex: 1,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    itemTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: Palette.ink,
        flex: 1,
    },
    unreadText: {
        fontWeight: '800',
    },
    itemBody: {
        fontSize: 14,
        color: Palette.inkSoft,
        marginBottom: 4,
        lineHeight: 20,
    },
    itemDate: {
        fontSize: 12,
        color: Palette.muted,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Palette.orange,
        marginLeft: 8,
    },
});
