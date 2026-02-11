import { Expo, ExpoPushMessage } from 'expo-server-sdk';

export class NotificationService {
    private expo: Expo;

    constructor() {
        this.expo = new Expo();
    }

    async sendPushBlocking(token: string, title: string, body: string, data?: any) {
        if (!Expo.isExpoPushToken(token)) {
            console.error(`Push token ${token} is not a valid Expo push token`);
            return;
        }

        const messages: ExpoPushMessage[] = [{
            to: token,
            sound: 'default',
            title,
            body,
            data: { withSome: 'data', ...data },
        }];

        const chunks = this.expo.chunkPushNotifications(messages);
        const tickets = [];

        for (const chunk of chunks) {
            try {
                const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            } catch (error) {
                console.error('Error sending chunks', error);
            }
        }
    }
}

export const notificationService = new NotificationService();
