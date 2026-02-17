import { useState, useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';
import { supabase } from '@/shared/lib/supabase';
import { useRouter } from 'expo-router';

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

async function registerForPushNotificationsAsync() {
    if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    if (!Device.isDevice) {
        // Only real devices can handle push notifications
        // But we fail silently or log to avoid breaking app in simulator
        console.log('Must use physical device for Push Notifications');
        return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        Alert.alert('Permissão negada', 'Não poderemos enviar atualizações sobre suas inscrições!');
        return;
    }

    // Get the token
    // Check for projectId in case it's needed (common in Managed Workflow)
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

    if (!projectId) {
        console.warn('Project ID not found in app.json (extra.eas.projectId). Push notifications may fail in Expo Go.');
    }

    try {
        const pushTokenString = (await Notifications.getExpoPushTokenAsync({
            projectId,
        })).data;

        console.log('Expo Push Token (Hooks):', pushTokenString);
        return pushTokenString;
    } catch (error: any) {
        console.error('Error getting push token:', error);

        if (error.message.includes('No "projectId" found')) {
            Alert.alert(
                'Configuração Necessária',
                'Para testar notificações no Expo Go, você precisa vincular o projeto ao EAS.\n\nPor favor, rode "eas init" no terminal.'
            );
        }

        return null;
    }
}

export function usePushNotifications(id: string | undefined) {
    const router = useRouter();
    const [expoPushToken, setExpoPushToken] = useState<string | undefined>('');
    const [notification, setNotification] = useState<Notifications.Notification | undefined>(undefined);
    const notificationListener = useRef<Notifications.EventSubscription | undefined>(undefined);
    const responseListener = useRef<Notifications.EventSubscription | undefined>(undefined);

    useEffect(() => {
        registerForPushNotificationsAsync().then(token => {
            if (token) {
                setExpoPushToken(token);
                saveTokenToProfile(token);
            }
        });

        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            setNotification(notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('User tapped notification:', response);
            const data = response.notification.request.content.data;
            if (data && data.eventId) {
                router.push(`/events/${data.eventId}`);
            } else {
                router.push('/notifications');
            }
        });

        return () => {
            notificationListener.current && notificationListener.current.remove();
            responseListener.current && responseListener.current.remove();
        };
    }, []);

    async function saveTokenToProfile(token: string) {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            console.log('Saving push token to profile...', token);

            // Using 'profiles' table as defined in Supabase schema
            const { error } = await supabase
                .from('profiles')
                .update({ expo_push_token: token })
                .eq('id', session.user.id);

            if (error) console.error('Error saving push token to DB:', error);
            else console.log('Push token saved successfully.');

        } catch (e) {
            console.error('Failed to save push token:', e);
        }
    }

    return {
        expoPushToken,
        notification,
    };
}
