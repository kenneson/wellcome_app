import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '@/shared/constants/theme';
import { notificationService, Notification } from '@/services/api/NotificationService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Typography local definition to ensure no import errors
const Typography = {
    fontSizes: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
        xl: 20,
        xxl: 24
    }
};

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
            activeOpacity={0.7}
        >
            <View style={styles.iconContainer}>
                <Ionicons
                    name={getIconName(item.type)}
                    size={24}
                    color={!item.read ? Colors.light.primary : '#888'}
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
            <Ionicons name="chevron-forward" size={16} color="#ccc" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Notificações</Text>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Colors.light.primary} />
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={item => item.id}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.light.primary]} />
                    }
                    contentContainerStyle={notifications.length === 0 ? styles.emptyList : styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="notifications-off-outline" size={64} color="#ccc" />
                            <Text style={styles.emptyText}>Nenhuma notificação encontrada</Text>
                        </View>
                    }
                    renderItem={renderItem}
                />
            )}
        </SafeAreaView>
    );
}

function getIconName(type: string): keyof typeof Ionicons.glyphMap {
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
        backgroundColor: '#fff', // Colors.light.background
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backButton: {
        marginRight: Spacing.md,
    },
    title: {
        fontSize: Typography.fontSizes.xl,
        fontWeight: 'bold',
        color: '#111', // Colors.light.text
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingBottom: 20,
    },
    emptyList: {
        flex: 1,
        justifyContent: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        marginTop: Spacing.md,
        color: '#888',
        fontSize: Typography.fontSizes.md,
        textAlign: 'center',
    },
    item: {
        flexDirection: 'row',
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    unreadItem: {
        backgroundColor: '#FFF8F0', // Very light orange/primary tint
    },
    iconContainer: {
        marginRight: Spacing.md,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
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
        fontSize: Typography.fontSizes.md,
        fontWeight: '600',
        color: '#111',
        flex: 1,
    },
    unreadText: {
        color: '#000',
        fontWeight: '700',
    },
    itemBody: {
        fontSize: Typography.fontSizes.sm,
        color: '#666',
        marginBottom: 4,
        lineHeight: 20,
    },
    itemDate: {
        fontSize: Typography.fontSizes.xs,
        color: '#999',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.light.primary,
        marginLeft: 8,
    },
});
