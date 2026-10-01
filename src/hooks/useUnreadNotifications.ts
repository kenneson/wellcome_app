import { notificationService } from '@/services/api/NotificationService';
import { useQuery } from '@tanstack/react-query';

/** Number of unread notifications, for header badges. Failures count as zero. */
export function useUnreadNotifications() {
    const { data = 0, refetch } = useQuery({
        queryKey: ['notifications', 'unread-count'],
        queryFn: async () => {
            const notifications = await notificationService.list();
            return notifications.filter((notification) => !notification.read).length;
        },
        staleTime: 60_000,
        retry: false,
    });

    return { unreadCount: data, refetch };
}
